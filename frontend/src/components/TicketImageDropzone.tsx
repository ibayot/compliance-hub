import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';

const ACCEPTED_IMAGE_TYPES =
  '.jpg,.jpeg,.png,.heic,.heif,.webp,image/jpeg,image/png,image/heic,image/heif,image/webp';
const ACCEPTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp']);
const ACCEPTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const isAcceptedImage = (file: File) => {
  const extension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
  const mime = file.type.toLowerCase();
  return (
    ACCEPTED_EXTENSIONS.has(extension) &&
    (!mime || ACCEPTED_MIME_TYPES.has(mime)) &&
    file.size <= MAX_IMAGE_BYTES
  );
};

interface TicketImageDropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  label: string;
  buttonLabel: string;
  multiple?: boolean;
  maxFiles?: number;
}

export default function TicketImageDropzone({
  files,
  onFilesChange,
  label,
  buttonLabel,
  multiple = true,
  maxFiles = 5,
}: TicketImageDropzoneProps) {
  const { enqueueSnackbar } = useSnackbar();

  const acceptFiles = (incoming: FileList | File[]) => {
    const selected = Array.from(incoming);
    const valid = selected.filter(isAcceptedImage);
    if (valid.length !== selected.length) {
      enqueueSnackbar('Only JPG, JPEG, PNG, HEIC/HEIF, and WebP images up to 10 MB are allowed.', {
        variant: 'error',
      });
    }
    if (valid.length === 0) return;

    const candidates = multiple ? [...files, ...valid] : [valid[0]];
    const deduplicated = candidates.filter(
      (file, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.name === file.name &&
            candidate.size === file.size &&
            candidate.lastModified === file.lastModified,
        ) === index,
    );
    if (deduplicated.length > maxFiles) {
      enqueueSnackbar(`A maximum of ${maxFiles} image${maxFiles === 1 ? '' : 's'} is allowed.`, {
        variant: 'warning',
      });
    }
    onFilesChange(deduplicated.slice(0, maxFiles));
  };

  return (
    <Box
      tabIndex={0}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        acceptFiles(event.dataTransfer.files);
      }}
      onPaste={(event) => {
        const pasted = Array.from(event.clipboardData.files);
        if (pasted.length > 0) {
          event.preventDefault();
          acceptFiles(pasted);
        }
      }}
      sx={{
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 1,
        p: 1.5,
        outline: 'none',
        '&:focus': { borderColor: 'primary.main' },
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>
        {label} Select, drag and drop, or focus here and paste from the clipboard.
      </Typography>
      <Button component="label" variant="outlined" size="small" startIcon={<UploadIcon />}>
        {buttonLabel}
        <input
          type="file"
          hidden
          multiple={multiple}
          accept={ACCEPTED_IMAGE_TYPES}
          onChange={(event) => {
            if (event.target.files) acceptFiles(event.target.files);
            event.target.value = '';
          }}
        />
      </Button>
      {files.length > 0 && (
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" mt={1}>
          {files.map((file, index) => (
            <Chip
              key={`${file.name}-${file.size}-${file.lastModified}`}
              label={file.name}
              size="small"
              onDelete={() => onFilesChange(files.filter((_, fileIndex) => fileIndex !== index))}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
