'use client';

import { useRouter } from 'next/navigation';
import { Box, Container } from '@mui/material';
import DocumentUpload from '@/components/documents/DocumentUpload';

export default function UploadPage() {
  const router = useRouter();

  const handleUploadSuccess = () => {
    // Redirect to documents list after successful upload
    setTimeout(() => {
      router.push('/dashboard/documents');
    }, 2000);
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <DocumentUpload onSuccess={handleUploadSuccess} />
      </Box>
    </Container>
  );
}
