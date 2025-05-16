export async function generateSha256Hash(message: string): Promise<string> {
  try {
    // Encode the string as UTF-8
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    // Hash the data
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert the ArrayBuffer to a hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    console.error('Error generating SHA-256 hash:', error);
    // Fallback or rethrow, depending on how critical hashing is.
    // For now, returning an empty string or a placeholder might indicate failure.
    return ''; 
  }
}
