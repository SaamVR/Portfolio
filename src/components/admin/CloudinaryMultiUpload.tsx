import CloudinaryUpload from "./CloudinaryUpload";
import { Label } from "@/components/ui/label";

interface CloudinaryMultiUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  folder?: string;
  label?: string;
}

const CloudinaryMultiUpload = ({
  images,
  onChange,
  maxImages = 4,
  folder = "products",
  label = "Additional Images",
}: CloudinaryMultiUploadProps) => {
  const slots = Array.from({ length: maxImages }, (_, i) => i);

  const handleChange = (index: number, url: string) => {
    const updated = [...images];
    while (updated.length <= index) updated.push("");
    updated[index] = url;
    onChange(updated);
  };

  return (
    <div className="grid gap-2">
      <Label>{label} (up to {maxImages})</Label>
      {slots.map((i) => (
        <CloudinaryUpload
          key={`multi-${i}`}
          value={images[i] ?? ""}
          onChange={(url) => handleChange(i, url)}
          folder={folder}
          label={`Upload image ${i + 2}`}
          showPreview={false}
        />
      ))}
    </div>
  );
};

export default CloudinaryMultiUpload;

