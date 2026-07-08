import { ArrowRight, Link as LinkIcon, Mail, MapPin, Phone, Quote } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { api, LOGO_URL } from './apiClient';

type SiteSettings = {
  company_name: string | null;
  tagline: string | null;
  project_role: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_image_url: string | null;
  about_text: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_address: string | null;
  contact_whatsapp: string | null;
  social_embeds: { platform: string; url: string }[] | null;
  community_platform: string | null;
  community_join_method: string | null;
  community_qr_url: string | null;
};

type SiteService = { id: number; title: string; description: string | null; icon_url: string | null };
type SiteTestimonial = { id: number; client_name: string; quote: string; avatar_url: string | null };
type SiteGalleryItem = { id: number; image_url: string; caption: string | null };

type SitePayload = {
  settings: SiteSettings;
  services: SiteService[];
  testimonials: SiteTestimonial[];
  gallery: SiteGalleryItem[];
};

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${visible ? 'is-visible' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function WelcomeView() {
  const { data, isLoading } = useQuery({ queryKey: ['public-site'], queryFn: async () => (await api.get<SitePayload>('/site')).data });

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="landing-brand">
          <img src={LOGO_URL} alt="Segmentos" />
          <span>{data?.settings.company_name ?? 'Segmentos'}</span>
        </div>
        <nav>
          <RouterLink to="/app" className="ghost-button">
            Ingresar
          </RouterLink>
          <RouterLink to="/portal" className="primary-button">
            Pedir cotizacion
          </RouterLink>
        </nav>
      </header>

      {isLoading || !data ? (
        <div className="loading-screen">
          <img src={LOGO_URL} alt="Segmentos" className="loading-logo" />
        </div>
      ) : (
        <>
          <section
            className="landing-hero"
            style={data.settings.hero_image_url ? ({ '--hero-image': `url(${data.settings.hero_image_url})` } as React.CSSProperties) : undefined}
          >
            <div className="landing-hero-content">
              <span className="eyebrow">{data.settings.project_role ?? 'Carpinteria de autor · Lima, Peru'}</span>
              <h1>{data.settings.hero_title ?? 'Mejorando tus espacios'}</h1>
              <p className="landing-subtitle">
                {data.settings.hero_subtitle ?? 'Disenamos y fabricamos piezas unicas para hogares y empresas, desde la idea hasta la instalacion final.'}
              </p>
              <div className="landing-hero-actions">
                <RouterLink to="/portal" className="primary-button">
                  Solicita tu cotizacion <ArrowRight size={16} />
                </RouterLink>
                <a href="#servicios" className="ghost-button">
                  Ver servicios
                </a>
              </div>
            </div>
            <div className="landing-scroll-cue">
              <span />
              Desliza
            </div>
          </section>

          {data.settings.about_text && (
            <section className="landing-section landing-about">
              <Reveal className="landing-section-inner">
                <span className="landing-kicker">Quienes somos</span>
                <p>{data.settings.about_text}</p>
              </Reveal>
            </section>
          )}

          {data.services.length > 0 && (
            <section className="landing-section" id="servicios">
              <Reveal className="landing-section-inner">
                <span className="landing-kicker">Servicios</span>
                <h2>Cada pieza, disenada alrededor de tu espacio</h2>
                <div className="landing-grid-3">
                  {data.services.map((service, index) => (
                    <article className="landing-card" key={service.id}>
                      <span className="landing-card-index">{String(index + 1).padStart(2, '0')}</span>
                      {service.icon_url && <img src={service.icon_url} alt={service.title} />}
                      <h3>{service.title}</h3>
                      {service.description && <p>{service.description}</p>}
                    </article>
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {data.gallery.length > 0 && (
            <section className="landing-section">
              <Reveal className="landing-section-inner">
                <span className="landing-kicker">Portafolio</span>
                <h2>Proyectos recientes</h2>
                <div className="landing-gallery">
                  {data.gallery.map((item) => (
                    <figure className="landing-gallery-item" key={item.id}>
                      <img src={item.image_url} alt={item.caption ?? 'Segmentos'} />
                      {item.caption && <figcaption>{item.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {data.testimonials.length > 0 && (
            <section className="landing-section landing-testimonials">
              <Reveal className="landing-section-inner">
                <span className="landing-kicker">Testimonios</span>
                <h2>Lo que dicen nuestros clientes</h2>
                <div className="landing-grid-3">
                  {data.testimonials.map((testimonial) => (
                    <article className="landing-card" key={testimonial.id}>
                      <Quote className="landing-testimonial-quote" size={22} />
                      <p>{testimonial.quote}</p>
                      <div className="landing-testimonial-author">
                        {testimonial.avatar_url && <img src={testimonial.avatar_url} alt={testimonial.client_name} />}
                        <strong>{testimonial.client_name}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {(() => {
            const activeEmbeds = (data.settings.social_embeds ?? []).filter((embed) => embed.url && embed.url.trim() !== '');
            return (
              activeEmbeds.length > 0 && (
                <section className="landing-section">
                  <Reveal className="landing-section-inner">
                    <span className="landing-kicker">Siguenos</span>
                    <h2>Nuestro trabajo, en vivo</h2>
                    <div className="landing-grid-3">
                      {activeEmbeds.map((embed, index) => (
                        <a className="landing-card landing-social" href={embed.url} target="_blank" rel="noopener" key={index}>
                          <span>{embed.platform}</span>
                          <LinkIcon size={16} />
                        </a>
                      ))}
                    </div>
                  </Reveal>
                </section>
              )
            );
          })()}

          {data.settings.community_platform && (
            <section className="landing-section landing-community">
              <Reveal className="landing-section-inner landing-community-inner">
                <div>
                  <span className="landing-kicker">Comunidad</span>
                  <h2>Unete a nuestra comunidad de {data.settings.community_platform}</h2>
                  {data.settings.community_join_method && (
                    <p className="landing-section-lede">Metodo de ingreso: {data.settings.community_join_method}</p>
                  )}
                </div>
                {data.settings.community_qr_url && <img className="landing-qr" src={data.settings.community_qr_url} alt="Codigo QR" />}
              </Reveal>
            </section>
          )}

          <section className="landing-section landing-contact">
            <Reveal className="landing-section-inner">
              <span className="landing-kicker">Contacto</span>
              <h2>Conversemos sobre tu proyecto</h2>
              <div className="landing-contact-grid">
                {data.settings.contact_phone && (
                  <div className="landing-contact-item">
                    <Phone size={18} />
                    <span>{data.settings.contact_phone}</span>
                  </div>
                )}
                {data.settings.contact_email && (
                  <div className="landing-contact-item">
                    <Mail size={18} />
                    <span>{data.settings.contact_email}</span>
                  </div>
                )}
                {data.settings.contact_address && (
                  <div className="landing-contact-item">
                    <MapPin size={18} />
                    <span>{data.settings.contact_address}</span>
                  </div>
                )}
              </div>
            </Reveal>
          </section>
        </>
      )}

      <footer className="landing-footer">
        <span>
          © {new Date().getFullYear()} {data?.settings.company_name ?? 'Segmentos'}
          {data?.settings.tagline ? ` — ${data.settings.tagline}` : ''}
        </span>
        <span>Hecho en Ica, Peru</span>
      </footer>
    </div>
  );
}
