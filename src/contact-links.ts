export function whatsappUrl(phone: string): string {
  let digits = phone.replace(/\D/g, "").replace(/^00/, "");
  if (digits.startsWith("54") && digits.length === 12) {
    digits = `549${digits.slice(2)}`;
  }
  return `https://wa.me/${digits}`;
}

export function gmailUrl(email: string): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email.trim())}`;
}
