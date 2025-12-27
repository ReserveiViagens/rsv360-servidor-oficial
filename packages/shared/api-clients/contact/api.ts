/**
 * 📧 Contact API Client
 * FASE: Cliente HTTP para formulário de contato
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface ContactMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactResponse {
  message: string;
  id: number;
}

/**
 * Enviar mensagem de contato
 */
export async function sendContactMessage(data: ContactMessage): Promise<ContactResponse> {
  const response = await fetch(`${API_BASE}/rsv360/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

