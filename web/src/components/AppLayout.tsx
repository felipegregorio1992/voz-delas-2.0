import { ReactNode } from 'react';
import AppHeader from './AppHeader';
import './AppLayout.css';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="app-layout">
      <AppHeader />
      <div className="app-layout-content">{children}</div>
      <footer className="app-footer">
        <img src="/images/footer_preto.png" alt="COOPTEC" className="app-footer-img" />
      </footer>
    </div>
  );
}
