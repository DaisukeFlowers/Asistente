import React from 'react';
import { Navbar } from '../components/Navbar.jsx';
import { Footer } from '../components/Footer.jsx';
import { SkipNavLink } from '../components/SkipNavLink.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { PRIVACY_POLICY_VERSION, PRIVACY_POLICY_LAST_UPDATED, CONTROLLER_INFO, SUPPORT_EMAIL } from '../legal/legalMeta.js';
// PolicyChangeBanner intentionally omitted now that this is a finalized baseline version.

// Final bilingual Privacy Policy baseline. Update version/date in legalMeta.js on material changes.

const LAST_UPDATED = PRIVACY_POLICY_LAST_UPDATED;
const VERSION = PRIVACY_POLICY_VERSION;

export default function PrivacyPolicy() {
  const { lang } = useI18n();
  const es = lang === 'es';
  return (
    <div className="flex flex-col min-h-dvh bg-slate-50">
      <SkipNavLink />
      <Navbar />
      <main id="main" className="flex-1" tabIndex={-1}>
        <div className="mx-auto max-w-3xl px-4 py-16">
          <article className="prose prose-slate max-w-none card p-8">
            <header>
              <h1 className="mb-2">{es ? 'Política de Privacidad' : 'Privacy Policy'}</h1>
              <p className="text-sm text-slate-500">{es ? 'Versión' : 'Version'} {VERSION} • {es ? 'Última actualización' : 'Last Updated'}: {LAST_UPDATED}</p>
              <p className="text-xs text-slate-500">
                {es ? 'Esta Política de Privacidad describe cómo recopilamos y tratamos datos personales cuando utilizas Schedulink. Nos limitamos a los datos necesarios para prestar el servicio de automatización de calendario.' : 'This Privacy Policy explains how we collect and process personal data when you use Schedulink. We limit processing to what is necessary to provide the calendar automation service.'}
              </p>
            </header>
            <section>
              <h2>{es ? '1. Introducción y Alcance' : '1. Introduction & Scope'}</h2>
              <p className="text-sm">{es ? 'Esta política aplica al uso de la plataforma Schedulink y cubre la autenticación mediante Google, el acceso a eventos de calendario para crearlos, modificarlos o listarlos y la generación de registros operativos necesarios.' : 'This policy applies to use of the Schedulink platform and covers Google authentication, access to calendar events to create, modify or list them, and generation of the operational logs necessary to deliver the service.'}</p>
            </section>
            <section>
              <h2>{es ? '2. Responsable del Tratamiento' : '2. Data Controller'}</h2>
              <p className="text-sm">
                {es ? 'Entidad operadora:' : 'Operating entity:'} {CONTROLLER_INFO.name}.<br />
                {es ? 'Dirección:' : 'Address:'} {CONTROLLER_INFO.address}.<br />
                {es ? 'País:' : 'Country:'} {CONTROLLER_INFO.country}.<br />
                {es ? 'Correo de contacto:' : 'Contact email:'} {SUPPORT_EMAIL}
              </p>
            </section>
            <section>
              <h2>{es ? '3. Datos Recopilados' : '3. Data Collected'}</h2>
              <ul className="text-sm list-disc pl-5">
                <li>{es ? 'Identificadores básicos de la cuenta de Google (sub, email, nombre, foto) para autenticación y personalización.' : 'Basic Google account identifiers (sub, email, name, picture) for authentication and personalization.'}</li>
                <li>{es ? 'Metadatos de eventos necesarios para crear, listar o actualizar eventos: título, horarios, participantes y descripciones proporcionadas por el usuario.' : 'Event metadata necessary to create, list or update events: title, times, attendees, and user‑provided descriptions.'}</li>
                <li>{es ? 'Registros técnicos mínimos (marcas de tiempo, ruta de API, código de estado) para seguridad y resolución de incidencias.' : 'Minimal technical logs (timestamps, API path, status code) for security and incident resolution.'}</li>
              </ul>
            </section>
            <section>
              <h2>{es ? '4. Base Legal / Finalidad' : '4. Lawful Basis / Purpose'}</h2>
              <p className="text-sm">{es ? 'Tratamos datos para ejecutar el contrato de prestación del servicio solicitado y, según corresponda, nuestro interés legítimo en mantener la seguridad operativa. No utilizamos los datos para perfiles de marketing.' : 'We process data to perform the contract for the requested service and, where applicable, our legitimate interest in maintaining operational security. We do not use the data for marketing profiling.'}</p>
            </section>
            <section>
              <h2>{es ? '5. Uso de los Datos' : '5. Data Usage'}</h2>
              <ul className="text-sm list-disc pl-5">
                <li>{es ? 'Crear, actualizar y mostrar eventos del calendario según tus acciones.' : 'Create, update and display calendar events in response to your actions.'}</li>
                <li>{es ? 'Proteger el servicio mediante controles de seguridad (auditoría, limitación de tasa, detección de abuso).' : 'Protect the service through security controls (auditing, rate limiting, abuse detection).'}</li>
                <li>{es ? 'Cumplir obligaciones legales aplicables.' : 'Comply with applicable legal obligations.'}</li>
              </ul>
            </section>
            <section>
              <h2>{es ? '6. Retención y Eliminación' : '6. Retention & Deletion'}</h2>
              <p className="text-sm">{es ? 'Conservamos datos de sesión mientras dure la sesión activa y registros técnicos por un período limitado necesario para seguridad y diagnósticos, tras lo cual se anonimizan o eliminan.' : 'We retain session data for the active session lifetime and technical logs for a limited period necessary for security and diagnostics, after which they are anonymized or deleted.'}</p>
            </section>
            <section>
              <h2>{es ? '7. Compartición / Subprocesadores' : '7. Sharing / Subprocessors'}</h2>
              <p className="text-sm">{es ? 'Compartimos datos únicamente con: (i) Google para autenticación y operaciones de calendario; (ii) proveedores de infraestructura de computación y almacenamiento bajo acuerdos de confidencialidad y seguridad equivalentes.' : 'We disclose data only to: (i) Google for authentication and calendar operations; (ii) infrastructure hosting providers under confidentiality and security terms consistent with this policy.'}</p>
            </section>
            <section>
              <h2>{es ? '8. Transferencias Internacionales' : '8. International Transfers'}</h2>
              <p className="text-sm">{es ? 'Los datos pueden procesarse en jurisdicciones donde operen nuestros proveedores de infraestructura. Implementamos salvaguardas (como cláusulas contractuales tipo) cuando se transfieren datos fuera del EEE o jurisdicciones con nivel adecuado.' : 'Data may be processed in jurisdictions where our infrastructure providers operate. We implement safeguards (such as standard contractual clauses) when transferring data outside the EEA or other territories with adequate protection.'}</p>
            </section>
            <section>
              <h2>{es ? '9. Medidas de Seguridad' : '9. Security Measures'}</h2>
              <ul className="text-sm list-disc pl-5">
                <li>{es ? 'Cifrado de tokens de actualización (AES-256-GCM) y rotación programada.' : 'Encrypted refresh tokens (AES‑256‑GCM) with scheduled rotation.'}</li>
                <li>{es ? 'Verificación de firmas JWT mediante JWKS y políticas de sesión (inactividad, absoluta, rotación).' : 'JWT signature verification via JWKS and session policies (idle, absolute, rotation).'}</li>
                <li>{es ? 'Controles de integridad: CSRF, limitación de tasa, cabeceras de seguridad y registro estructurado.' : 'Integrity controls: CSRF, rate limiting, security headers and structured logging.'}</li>
              </ul>
            </section>
            <section>
              <h2>{es ? '10. Derechos de Usuario' : '10. User Rights'}</h2>
              <p className="text-sm">{es ? 'Según la legislación aplicable puedes solicitar acceso, rectificación o eliminación de tus datos personales y oponerte a ciertos tratamientos. Envía tu solicitud a ' : 'Subject to applicable law you may request access, rectification or deletion of your personal data and object to certain processing. Submit requests to '}<a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
            </section>
            <section>
              <h2>{es ? '11. Revocar Acceso de Google' : '11. Revoking Google Access'}</h2>
              <p className="text-sm">{es ? 'Puedes revocar los permisos de Schedulink en la configuración de tu cuenta de Google:' : 'You can revoke Schedulink permissions at your Google account settings:'} <a className="underline" href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">https://myaccount.google.com/permissions</a></p>
            </section>
            <section>
              <h2>{es ? '12. Cambios a esta Política' : '12. Changes to this Policy'}</h2>
              <p className="text-sm">{es ? 'Publicaremos cualquier cambio relevante actualizando la versión y fecha en la parte superior. Si el cambio es material, proporcionaremos un aviso destacado antes de que entre en vigor.' : 'We will publish material changes by updating the version and date above. If a change is material we will provide a prominent notice before it takes effect.'}</p>
            </section>
            <section>
              <h2>{es ? '13. Contacto' : '13. Contact'}</h2>
              <p className="text-sm">{es ? 'Preguntas o solicitudes sobre esta política:' : 'Questions or requests about this policy:'} <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
            </section>
            <footer className="mt-8 text-xs text-slate-500">
              {es ? 'Versión inicial publicada. Revisa periódicamente si hay actualizaciones.' : 'Initial published version. Review periodically for updates.'}
            </footer>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
