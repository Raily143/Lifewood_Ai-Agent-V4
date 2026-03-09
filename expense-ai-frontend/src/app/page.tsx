'use client';

import { driveService } from '../services/driveService';
import styles from './page.module.css';

const LOGO_URL =
  'https://framerusercontent.com/images/BZSiFYgRc4wDUAuEybhJbZsIBQY.png';

export default function HomePage() {
  const handleConnect = async () => {
    const url = await driveService.getAuthUrl();
    window.location.href = url;
  };

  return (
    <main className={styles.pageShell}>
      <section className={styles.card}>
        <img alt="Lifewood" className={styles.logo} src={LOGO_URL} />
        <h1>Expense AI</h1>
        <p>Connect Google Drive to continue.</p>
        <div className={styles.actions}>
          <button className={styles.primaryButton} onClick={handleConnect} type="button">
            Connect Google Drive
          </button>
          <a className={styles.secondaryButton} href="/drive">
            Open Dashboard
          </a>
        </div>
      </section>
    </main>
  );
}
