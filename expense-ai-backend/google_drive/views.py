import os
import tempfile
from django.shortcuts import redirect
from django.http import HttpResponse, JsonResponse
from django.conf import settings
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

from .models import GoogleDriveToken
from .utils import get_user_drive_credentials

# Allow OAuth over HTTP for local development
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'

# Configuration
GOOGLE_CLIENT_SECRETS = getattr(
    settings,
    'GOOGLE_CLIENT_SECRETS',
    os.path.join(settings.BASE_DIR, 'expense_ai', 'credentials.json')
)
SCOPES = ['https://www.googleapis.com/auth/drive']

def google_drive_auth(request):
    """Step 1: Redirect user to Google Authorization page."""
    flow = Flow.from_client_secrets_file(
        GOOGLE_CLIENT_SECRETS,
        scopes=SCOPES,
        redirect_uri='http://localhost:8000/api/google/callback/'
    )
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'  # Forces Google to provide a refresh_token
    )
    
    # Store verifier and state in session
    request.session['code_verifier'] = flow.code_verifier
    request.session['state'] = state
    
    return redirect(authorization_url)

def oauth2callback(request):
    """Step 2: Handle the callback from Google and save tokens."""
    if not request.user.is_authenticated:
        return redirect('http://localhost:8000/admin/login/')

    saved_verifier = request.session.get('code_verifier')
    
    flow = Flow.from_client_secrets_file(
        GOOGLE_CLIENT_SECRETS,
        scopes=SCOPES,
        redirect_uri='http://localhost:8000/api/google/callback/',
        code_verifier=saved_verifier
    )
    
    try:
        flow.fetch_token(authorization_response=request.build_absolute_uri())
    except Exception as e:
        print(f"Token fetch failed: {e}")
        return redirect('http://localhost:3000?error=auth_failed')

    creds = flow.credentials

    # Save or update tokens in the database
    GoogleDriveToken.objects.update_or_create(
        user=request.user,
        defaults={
            'access_token': creds.token,
            'refresh_token': creds.refresh_token,
            'token_uri': creds.token_uri,
            'client_id': creds.client_id,
            'client_secret': creds.client_secret,
            'scopes': ','.join(creds.scopes),
        }
    )

    return redirect('http://localhost:3000/drive?status=success')

def list_drive_files(request):
    """Fetch Lifewood folders and their contents as a nested tree."""
    creds = get_user_drive_credentials(request.user)
    
    if not creds:
        return JsonResponse({'error': 'Not authenticated'}, status=401)

    try:
        service = build('drive', 'v3', credentials=creds)

        def get_children(folder_id):
            """Recursively fetch contents of a folder."""
            results = service.files().list(
                q=f"'{folder_id}' in parents and trashed=false",
                fields="files(id, name, mimeType, size, modifiedTime, webViewLink)",
                pageSize=200,
                orderBy="folder,name"
            ).execute()
            items = results.get('files', [])
            for item in items:
                if item['mimeType'] == 'application/vnd.google-apps.folder':
                    item['children'] = get_children(item['id'])
            return items

        # Find all folders whose name contains "lifewood" (case-insensitive)
        folders_result = service.files().list(
            q="mimeType='application/vnd.google-apps.folder' and name contains 'lifewood' and trashed=false",
            fields="files(id, name, mimeType, webViewLink)",
            pageSize=50,
            orderBy="name"
        ).execute()

        lifewood_folders = folders_result.get('files', [])

        for folder in lifewood_folders:
            folder['children'] = get_children(folder['id'])

        return JsonResponse(lifewood_folders, safe=False)

    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        extra = None
        try:
            extra = getattr(e, 'content', None)
            if extra and isinstance(extra, (bytes, bytearray)):
                extra = extra.decode('utf-8', errors='replace')
        except Exception:
            extra = None

        if settings.DEBUG:
            payload = {'error': str(e) or 'HttpError', 'traceback': tb}
            if extra:
                payload['detail'] = extra
            return JsonResponse(payload, status=500)

        return JsonResponse({'error': 'Internal server error'}, status=500)


def get_drive_file_content(request, file_id):
    """Stream a Google Drive file through the backend for in-app previews."""
    creds = get_user_drive_credentials(request.user)

    if not creds:
        return JsonResponse({'error': 'Not authenticated'}, status=401)

    try:
        service = build('drive', 'v3', credentials=creds)
        metadata = service.files().get(fileId=file_id, fields="id,name,mimeType").execute()
        mime_type = metadata.get('mimeType', 'application/octet-stream')

        # Google-native docs cannot be fetched as raw media without export logic.
        if mime_type.startswith('application/vnd.google-apps'):
            return JsonResponse(
                {'error': 'Preview is only available for uploaded files, not Google-native documents.'},
                status=400,
            )

        content = service.files().get_media(fileId=file_id).execute()
        response = HttpResponse(content, content_type=mime_type)
        response['Content-Disposition'] = f'inline; filename="{metadata.get("name", file_id)}"'
        return response
    except Exception as e:
        if settings.DEBUG:
            return JsonResponse({'error': str(e)}, status=500)
        return JsonResponse({'error': 'Unable to load file content'}, status=500)


@csrf_exempt
@require_POST
def upload_drive_file(request, folder_id):
    """Upload a file to a selected Google Drive folder using stored OAuth credentials."""
    creds = get_user_drive_credentials(request.user)

    if not creds:
        return JsonResponse({'error': 'Not authenticated'}, status=401)

    uploaded_file = request.FILES.get('file')
    if not uploaded_file:
        return JsonResponse({'error': 'No file uploaded'}, status=400)

    temp_path = None

    try:
        service = build('drive', 'v3', credentials=creds)

        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            for chunk in uploaded_file.chunks():
                temp_file.write(chunk)
            temp_path = temp_file.name

        file_metadata = {
            'name': uploaded_file.name,
            'parents': [folder_id],
        }
        media = MediaFileUpload(
            temp_path,
            mimetype=uploaded_file.content_type or 'application/octet-stream',
            resumable=False,
        )

        created = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id,name,mimeType,size,modifiedTime,webViewLink',
        ).execute()

        return JsonResponse(created, status=201)
    except Exception as e:
        if settings.DEBUG:
            return JsonResponse({'error': str(e)}, status=500)
        return JsonResponse({'error': 'Unable to upload file'}, status=500)
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@csrf_exempt
@require_POST
def delete_drive_file(request, file_id):
    """Delete a Google Drive item using stored OAuth credentials."""
    creds = get_user_drive_credentials(request.user)

    if not creds:
        return JsonResponse({'error': 'Not authenticated'}, status=401)

    try:
        service = build('drive', 'v3', credentials=creds)
        service.files().delete(fileId=file_id).execute()
        return JsonResponse({'success': True})
    except Exception as e:
        if settings.DEBUG:
            return JsonResponse({'error': str(e)}, status=500)
        return JsonResponse({'error': 'Unable to delete file'}, status=500)
