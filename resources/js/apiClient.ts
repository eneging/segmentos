import axios from 'axios';

export const api = axios.create({ baseURL: '/api/v1', withCredentials: true, withXSRFToken: true });

export const LOGO_URL = 'https://res.cloudinary.com/dhuggiq9q/image/upload/v1783518145/199fe674-0858-4e7f-977e-7b3a4208ef45_v4rwhs.jpg';
