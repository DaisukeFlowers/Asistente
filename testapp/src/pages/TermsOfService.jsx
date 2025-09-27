import React from 'react';
import { Navbar } from '../components/Navbar.jsx';
import { Footer } from '../components/Footer.jsx';
import { SkipNavLink } from '../components/SkipNavLink.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { TERMS_VERSION, TERMS_LAST_UPDATED, CONTROLLER_INFO, SUPPORT_EMAIL } from '../legal/legalMeta.js';
// PolicyChangeBanner not shown on finalized baseline version.

// Final bilingual Terms of Service baseline. Update version/date in legalMeta.js on material changes.
const LAST_UPDATED = TERMS_LAST_UPDATED;
const VERSION = TERMS_VERSION;

export default function TermsOfService() {
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
              <h1 className="mb-2">{es ? 'Términos de Servicio' : 'Terms of Service'}</h1>
              <p className="text-sm text-slate-500">{es ? 'Versión' : 'Version'} {VERSION} • {es ? 'Última actualización' : 'Last Updated'}: {LAST_UPDATED}</p>
              <p className="text-xs text-slate-500">{es ? 'Estos Términos regulan el uso de Schedulink. Al iniciar sesión con tu cuenta de Google aceptas este acuerdo.' : 'These Terms govern your use of Schedulink. By signing in with your Google account you agree to this agreement.'}</p>
            </header>
            <section>
              <h2>{es ? '1. Descripción del Servicio' : '1. Service Description'}</h2>
              <p className="text-sm">{es ? 'Schedulink es una capa de software que facilita la creación, modificación y consulta de eventos en tu Google Calendar mediante flujos asistidos.' : 'Schedulink is a software layer that facilitates creating, modifying and viewing events in your Google Calendar through assisted flows.'}</p>
            </section>
            <section>
              <h2>{es ? '2. Elegibilidad de Cuenta' : '2. Account Eligibility'}</h2>
              <p className="text-sm">{es ? 'Debes disponer de una cuenta de Google válida y tener capacidad legal para celebrar contratos. Nos reservamos el derecho de rechazar acceso por motivos de abuso o riesgo de seguridad.' : 'You must have a valid Google account and legal capacity to contract. We reserve the right to refuse access for abuse or security risk.'}</p>
            </section>
            <section>
              <h2>{es ? '3. Entidad Operadora / Controlador' : '3. Operating Entity / Controller'}</h2>
              <p className="text-sm">
                {es ? 'Entidad:' : 'Entity:'} {CONTROLLER_INFO.name}. {es ? 'Dirección:' : 'Address:'} {CONTROLLER_INFO.address}. {es ? 'Contacto:' : 'Contact:'} {SUPPORT_EMAIL}.
              </p>
            </section>
            <section>
              <h2>{es ? '4. Uso Aceptable' : '4. Acceptable Use'}</h2>
              <ul className="text-sm list-disc pl-5">
                <li>{es ? 'No utilizar el servicio para enviar spam, distribuir malware o infringir derechos.' : 'Do not use the service to send spam, distribute malware or infringe rights.'}</li>
                <li>{es ? 'No intentar eludir o desactivar controles de seguridad.' : 'Do not attempt to circumvent or disable security controls.'}</li>
                <li>{es ? 'No interferir con la disponibilidad (por ejemplo, ataques de denegación).' : 'Do not interfere with availability (e.g., denial of service attacks).'} </li>
              </ul>
            </section>
            <section>
              <h2>{es ? '5. Responsabilidades del Usuario' : '5. User Responsibilities'}</h2>
              <p className="text-sm">{es ? 'Eres responsable de la exactitud de la información de eventos que introduces y de revisar periódicamente los permisos concedidos en tu cuenta de Google.' : 'You are responsible for the accuracy of event information you submit and for periodically reviewing the permissions granted in your Google account.'}</p>
            </section>
            <section>
              <h2>{es ? '6. Disponibilidad' : '6. Availability'}</h2>
              <p className="text-sm">{es ? 'El servicio se ofrece "tal cual" y puede experimentar interrupciones programadas o no programadas. Podremos introducir límites de uso razonables.' : 'The service is provided “as is” and may experience scheduled or unscheduled interruptions. We may introduce reasonable usage limits.'}</p>
            </section>
            <section>
              <h2>{es ? '7. Servicios de Terceros' : '7. Third-Party Services'}</h2>
              <p className="text-sm">{es ? 'El uso de APIs de Google está sujeto además a los términos y políticas de Google. No controlamos los cambios que Google pueda introducir en sus servicios.' : 'Use of Google APIs is additionally subject to Google’s terms and policies. We do not control changes Google may introduce to its services.'}</p>
            </section>
            <section>
              <h2>{es ? '8. Propiedad Intelectual' : '8. Intellectual Property'}</h2>
              <p className="text-sm">{es ? 'El software, documentación y marcas de Schedulink pertenecen a la entidad operadora. Se concede una licencia limitada, revocable y no exclusiva para utilizar el servicio conforme a estos Términos.' : 'Schedulink software, documentation and trademarks belong to the operating entity. A limited, revocable, non‑exclusive license is granted to use the service in accordance with these Terms.'}</p>
            </section>
            <section>
              <h2>{es ? '9. Pagos y Planes' : '9. Payment & Plans'}</h2>
              <p className="text-sm">{es ? 'Ciertas funcionalidades pueden introducir precios en el futuro. Te notificaremos con antelación razonable cualquier cambio que requiera pago.' : 'Certain features may introduce pricing in the future. We will provide reasonable advance notice of any change requiring payment.'}</p>
            </section>
            <section>
              <h2>{es ? '10. Terminación' : '10. Termination'}</h2>
              <p className="text-sm">{es ? 'Podemos suspender o finalizar el acceso si hay incumplimiento sustancial, fraude, abuso del servicio o riesgo de seguridad. Puedes dejar de usar el servicio en cualquier momento.' : 'We may suspend or terminate access for substantial breach, fraud, service abuse or security risk. You may discontinue use at any time.'}</p>
            </section>
            <section>
              <h2>{es ? '11. Exención de Garantías' : '11. Disclaimer of Warranties'}</h2>
              <p className="text-sm">{es ? 'El servicio se ofrece "tal cual" y "según disponibilidad" sin garantías de comerciabilidad, idoneidad para un propósito particular o no infracción.' : 'The service is provided “as is” and “as available” without warranties of merchantability, fitness for a particular purpose or non‑infringement.'}</p>
            </section>
            <section>
              <h2>{es ? '12. Limitación de Responsabilidad' : '12. Limitation of Liability'}</h2>
              <p className="text-sm">{es ? 'En la medida permitida por ley, nuestra responsabilidad agregada por todas las reclamaciones derivadas o relacionadas con el servicio no excederá el mayor de 50 EUR o la cantidad pagada por ti en los 12 meses previos.' : 'To the extent permitted by law, our aggregate liability for all claims arising out of or related to the service will not exceed the greater of 50 EUR or the amount you paid in the preceding 12 months.'}</p>
            </section>
            <section>
              <h2>{es ? '13. Indemnización' : '13. Indemnification'}</h2>
              <p className="text-sm">{es ? 'Indemnizarás y mantendrás indemne a Schedulink frente a reclamaciones de terceros derivadas de tu uso que infrinja estos Términos o vulnere la ley, salvo que dichas reclamaciones se deban a nuestra propia negligencia grave.' : 'You will indemnify and hold Schedulink harmless from third‑party claims arising from your use that violates these Terms or law, except to the extent such claims result from our own gross negligence.'}</p>
            </section>
            <section>
              <h2>{es ? '14. Ley Aplicable / Jurisdicción' : '14. Governing Law / Jurisdiction'}</h2>
              <p className="text-sm">{es ? 'Este acuerdo se rige por las leyes de España, excluyendo sus principios de conflicto de leyes. Las partes se someten a la jurisdicción exclusiva de los tribunales competentes de Madrid.' : 'This agreement is governed by the laws of Spain, excluding its conflict of law principles. The parties submit to the exclusive jurisdiction of the competent courts in Madrid.'}</p>
            </section>
            <section>
              <h2>{es ? '15. Modificaciones' : '15. Modifications'}</h2>
              <p className="text-sm">{es ? 'Podemos modificar estos Términos publicando una versión actualizada con una nueva fecha. Los cambios sustanciales se comunicarán con aviso razonable.' : 'We may modify these Terms by posting an updated version with a new date. Material changes will be communicated with reasonable notice.'}</p>
            </section>
            <section>
              <h2>{es ? '16. Contacto' : '16. Contact'}</h2>
              <p className="text-sm">{es ? 'Consultas:' : 'Inquiries:'} <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
            </section>
            <footer className="mt-8 text-xs text-slate-500">
              {es ? 'Versión inicial publicada. Revisa periódicamente si hay cambios.' : 'Initial published version. Review periodically for changes.'}
            </footer>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
