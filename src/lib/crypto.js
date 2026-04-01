/**
 * Módulo de criptografia usando Web Crypto API (nativa do navegador).
 * Senhas nunca são armazenadas em texto puro.
 */

/**
 * Gera um hash SHA-256 de uma string.
 * @param {string} text - Texto para ser hasheado (ex: senha).
 * @returns {Promise<string>} Hash em hexadecimal.
 */
export async function hashPassword(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifica se uma senha em texto puro corresponde a um hash.
 * @param {string} plainText - Senha digitada pelo usuário.
 * @param {string} hash - Hash armazenado no banco.
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(plainText, hash) {
  const hashed = await hashPassword(plainText);
  return hashed === hash;
}
