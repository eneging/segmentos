import axios from 'axios';
import { ImagePlus } from 'lucide-react';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { api, LOGO_URL } from './apiClient';

type PortalFormValues = {
  name: string;
  email: string;
  password: string;
  phone: string;
  title: string;
  description: string;
};

export function QuotePortalView() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState } = useForm<PortalFormValues>();
  const [file, setFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const { data: site } = useQuery({
    queryKey: ['public-site'],
    queryFn: async () => (await api.get<{ settings: { hero_image_url: string | null } }>('/site')).data,
  });

  const onSubmit = async (values: PortalFormValues) => {
    setFieldErrors({});
    setGeneralError(null);

    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, value));
    if (file) formData.append('reference_image', file);

    try {
      await axios.get('/sanctum/csrf-cookie', { withCredentials: true });
      await api.post('/register', formData);
      navigate('/app');
    } catch (err: any) {
      if (err?.response?.status === 422) {
        setFieldErrors(err.response.data.errors ?? {});
      } else {
        setGeneralError('No pudimos enviar tu solicitud. Intenta de nuevo.');
      }
    }
  };

  return (
    <div className="portal-shell">
      <div
        className="portal-visual"
        style={site?.settings.hero_image_url ? { backgroundImage: `url(${site.settings.hero_image_url})` } : undefined}
      >
        <RouterLink to="/" className="portal-back">
          ← Volver al inicio
        </RouterLink>
        <div>
          <span className="landing-kicker">Segmentos</span>
          <h1>Cuentanos tu idea, la hacemos realidad</h1>
        </div>
      </div>

      <div className="portal-form-side">
        <div className="portal-form-inner">
          <img className="login-logo" src={LOGO_URL} alt="Segmentos" />
          <h2>Solicita tu cotizacion</h2>
          <p className="landing-subtitle">Crea tu cuenta y cuentanos tu proyecto en un solo paso.</p>
          {generalError && <p className="login-error">{generalError}</p>}
          <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
            <label>
              Nombre completo
              <input {...register('name', { required: true })} />
              {fieldErrors.name && <span className="login-error">{fieldErrors.name[0]}</span>}
            </label>
            <label>
              Correo
              <input type="email" {...register('email', { required: true })} />
              {fieldErrors.email && <span className="login-error">{fieldErrors.email[0]}</span>}
            </label>
            <label>
              Contrasena
              <input type="password" {...register('password', { required: true, minLength: 6 })} />
              {fieldErrors.password && <span className="login-error">{fieldErrors.password[0]}</span>}
            </label>
            <label>
              Telefono
              <input {...register('phone')} />
            </label>
            <label>
              Titulo de tu proyecto
              <input placeholder="Ej: Closet para dormitorio principal" {...register('title', { required: true })} />
              {fieldErrors.title && <span className="login-error">{fieldErrors.title[0]}</span>}
            </label>
            <label>
              Cuentanos tu idea
              <textarea rows={4} {...register('description', { required: true })} />
              {fieldErrors.description && <span className="login-error">{fieldErrors.description[0]}</span>}
            </label>
            <label>
              Imagen de referencia (opcional)
              <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </label>
            <button className="primary-button" disabled={formState.isSubmitting}>
              <ImagePlus size={17} /> Enviar solicitud
            </button>
          </form>
          <p className="landing-subtitle">
            ¿Ya tienes cuenta? <RouterLink to="/app">Inicia sesion</RouterLink>
          </p>
        </div>
      </div>
    </div>
  );
}
