/**
 * Safe File Download Utility
 * Handles Blob responses properly, preventing corrupted "undefined" text files.
 */
export function downloadBlob(res, filename, defaultMimeType = 'application/octet-stream') {
  let blob;
  if (res instanceof Blob) {
    blob = res;
  } else if (res?.data instanceof Blob) {
    blob = res.data;
  } else if (res) {
    blob = new Blob([res?.data || res], { type: defaultMimeType });
  } else {
    throw new Error('No data received from the server.');
  }

  // Safety check: ensure file is not empty or corrupted (e.g. 9-byte "undefined" string)
  if (blob.size < 50) {
    throw new Error(`Downloaded file is invalid or empty (${blob.size} bytes).`);
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
