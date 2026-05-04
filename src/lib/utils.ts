import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return 'Just now';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Just now';
  return d.toLocaleDateString('en-UG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export async function uploadToImgBB(base64Image: string) {
  const apiKey = "600ae7d030f135306922e84e33e4a07b";
  const formData = new FormData();
  formData.append('image', base64Image.split(',')[1]);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    return data.data.url;
  } catch (error) {
    console.error("ImgBB upload error:", error);
    return null;
  }
}
