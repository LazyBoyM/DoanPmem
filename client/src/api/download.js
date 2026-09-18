import axiosClient from './axiosClient';

export async function downloadFile(path, filename) {
    const blob = await axiosClient.get(path, { responseType: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
