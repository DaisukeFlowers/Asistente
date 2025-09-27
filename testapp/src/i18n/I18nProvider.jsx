import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// Simple in-app i18n. Spanish (es) is default per requirement; English (en) preserved for audit.
// Add or adjust keys carefully; do NOT remove existing English phrases (kept for compliance review).
const translations = {
  es: {
    nav: { home: 'Inicio', privacy: 'Política de Privacidad', terms: 'Términos de Servicio', contact: 'Contacto', dashboard: 'Panel' },
    hero: {
      tagline: 'Tu asistente virtual para una programación más inteligente.',
      description: 'Schedulink conecta tu Google Calendar, correo y chats para que puedas gestionar citas y mensajes directamente desde WhatsApp.',
      compliance: 'Solicitamos acceso a Google Calendar solo para ayudarte a crear, actualizar y gestionar eventos que controlas. Puedes revocar el acceso en cualquier momento desde los permisos de tu Cuenta de Google.'
    },
    featuresTitle: 'Características Clave',
    features: {
      automated: { title: 'Reservas Automáticas', body: 'Programa eventos al instante.' },
      reminders: { title: 'Recordatorios Inteligentes', body: 'No pierdas tareas importantes.' },
      secure: { title: 'Acceso Seguro', body: 'Permisos controlados por el usuario (OAuth).' }
    },
    footer: {
      description: 'Asistente de programación conectado a tu Google Calendar. Acceso solicitado solo para gestionar eventos que creas o modificas.'
    },
    complianceNoteShort: 'Acceso a Calendar solo para eventos que gestionas; revocable en cualquier momento.',
    dashboard: { title: 'Panel', logout: 'Cerrar sesión', notAuth: 'No autenticado.' },
    permissions: {
      title: 'Permisos Solicitados',
      intro: 'Schedulink utiliza únicamente los permisos mínimos necesarios para automatizar tu agenda.',
      scopesHeading: 'Al autorizar tu cuenta de Google aceptas conceder:',
      scopes: {
        openid: 'Identificación básica (openid, perfil, email) para autenticar tu sesión.',
        calendar: 'Acceso a Google Calendar para leer y crear/actualizar eventos que gestionas.'
      },
      revocation: 'Puedes revocar el acceso en cualquier momento desde la página de permisos de tu Cuenta de Google.',
      revokeLinkLabel: 'Gestionar permisos en Google'
      ,revocationStepsHeading: 'Cómo revocar el acceso',
      revocationSteps: [
        'Abre https://myaccount.google.com/permissions',
        'Selecciona Schedulink en la lista de aplicaciones de terceros',
        'Pulsa "Quitar acceso" y confirma'
      ],
      revocationNote: 'Al revocar, tu sesión activa se invalidará y deberás volver a autorizar para usar funciones de calendario.'
    },
    privacy: {
      heading: 'Política de Privacidad de Schedulink (Provisional)',
      intro: 'Esta página provisional será reemplazada por la Política de Privacidad completa de Schedulink. Antes de producción y la verificación de Google OAuth, se publicará información detallada sobre recopilación, almacenamiento, uso y derechos del usuario.',
      bullets: {
        dataAccess: 'Qué datos accedemos: eventos de Google Calendar (lectura/escritura).',
        purpose: 'Propósito: Proporcionar automatización de programación vía asistente de WhatsApp y canales relacionados.',
        retention: 'Retención: Metadatos mínimos de eventos almacenados solo cuando sea necesario para recordatorios (a documentar).',
        revocation: 'Revocación: El usuario puede revocar en cualquier momento en los permisos de su Cuenta de Google.'
      }
    },
    terms: {
      heading: 'Términos de Servicio de Schedulink (Provisional)',
      intro: 'Este contenido provisional será reemplazado por los Términos de Servicio formales de Schedulink. Incluirá uso aceptable, responsabilidades del usuario, limitación de responsabilidad, tratamiento de datos y cláusulas de terminación.',
      items: {
        service: 'Servicio: Asistir con la programación de calendario vía WhatsApp y canales de comunicación integrados.',
        responsibility: 'Responsabilidad del Usuario: Proporcionar datos de programación precisos.',
        availability: 'Disponibilidad: Servicio beta, sin garantías de uptime aún.',
        termination: 'Terminación: Podemos suspender por abuso.'
      }
    },
    contact: {
      heading: 'Soporte de Schedulink',
      line1: 'Para soporte, preguntas de integración o solicitudes de datos escribe a:',
      line2: 'Incluye el correo de tu cuenta de Google si está relacionado con acceso al calendario para que podamos investigar de forma segura.'
    }
  },
  en: {
    nav: { home: 'Home', privacy: 'Privacy Policy', terms: 'Terms of Service', contact: 'Contact', dashboard: 'Dashboard' },
    hero: {
      tagline: 'Your virtual assistant for smarter scheduling.',
      description: 'Schedulink connects to your Google Calendar, email, and chats so you can manage appointments and messages directly from WhatsApp.',
      compliance: 'We request Google Calendar access only to help you create, update, and manage events you control. You can revoke access anytime in your Google Account permissions.'
    },
    featuresTitle: 'Core Features',
    features: {
      automated: { title: 'Automated Bookings', body: 'Schedule events instantly.' },
      reminders: { title: 'Smart Reminders', body: 'Never miss important tasks.' },
      secure: { title: 'Secure Access', body: 'OAuth-based, user-controlled permissions.' }
    },
    footer: {
      description: 'Scheduling assistant that connects to your Google Calendar. Access requested only to manage events you create or modify.'
    },
    complianceNoteShort: 'Calendar access only to manage events you control; revocable anytime.',
    dashboard: { title: 'Dashboard', logout: 'Logout', notAuth: 'Not authenticated.' },
    permissions: {
      title: 'Requested Permissions',
      intro: 'Schedulink uses only the minimal permissions required to automate your scheduling.',
      scopesHeading: 'When you authorize your Google account you grant:',
      scopes: {
        openid: 'Basic identity (openid, profile, email) to authenticate your session.',
        calendar: 'Google Calendar access to read and create/update events you manage.'
      },
      revocation: 'You can revoke access at any time from your Google Account permissions page.',
      revokeLinkLabel: 'Manage permissions in Google'
      ,revocationStepsHeading: 'How to revoke access',
      revocationSteps: [
        'Open https://myaccount.google.com/permissions',
        'Find Schedulink in the list of third-party apps',
        'Click "Remove Access" and confirm'
      ],
      revocationNote: 'After revocation your active session will stop working; re-authorize to restore calendar features.'
    },
    privacy: {
      heading: 'Schedulink Privacy Policy (Placeholder)',
      intro: "This placeholder page will be replaced with Schedulink's full Privacy Policy. Before production and Google OAuth verification, publish comprehensive information about data collection, storage, usage, and user rights.",
      bullets: {
        dataAccess: 'What data we access: Google Calendar events (read/write).',
        purpose: 'Purpose: Provide scheduling automation via WhatsApp assistant and related channels.',
        retention: 'Retention: Minimal event metadata stored only as needed for reminders (to be documented).',
        revocation: 'Revocation: Users can revoke at any time in Google Account permissions.'
      }
    },
    terms: {
      heading: 'Schedulink Terms of Service (Placeholder)',
      intro: "This placeholder will be replaced with Schedulink's formal Terms of Service. Include acceptable use, user responsibilities, limitation of liability, data handling, and termination clauses.",
      items: {
        service: 'Service: Assist with calendar scheduling via WhatsApp and integrated communication channels.',
        responsibility: 'User Responsibility: Provide accurate scheduling data.',
        availability: 'Availability: Beta service, no uptime guarantees yet.',
        termination: 'Termination: We may suspend for abuse.'
      }
    },
    contact: {
      heading: 'Schedulink Support',
      line1: 'For support, integration questions, or data requests email:',
      line2: 'Include your Google account email if related to calendar access so we can investigate securely.'
    }
  }
};

const I18nContext = createContext({ lang: 'es', setLang: () => {}, t: translations.es });

export function I18nProvider({ children }) {
  const [lang, setLang] = useState('es'); // default Spanish

  const switchLang = useCallback((code) => {
    setLang(code === 'en' ? 'en' : 'es');
  }, []);

  const value = useMemo(() => ({
    lang,
    setLang: switchLang,
    t: translations[lang]
  }), [lang, switchLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

// Helper component to render a language switch control; can be placed in Navbar.
export function LanguageSwitcher({ className = '' }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={`flex items-center gap-2 text-xs font-medium ${className}`} aria-label="Language selector">
      <button
        type="button"
        onClick={() => setLang('es')}
        className={`px-2 py-1 rounded transition ${lang==='es' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
      >ES</button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-2 py-1 rounded transition ${lang==='en' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
      >EN</button>
    </div>
  );
}
