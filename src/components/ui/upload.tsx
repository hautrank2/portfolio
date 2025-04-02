"use client";

import React, {
  ChangeEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "./button";
import { ImagePlus, Trash2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { fetchFile, filesArrayToFileList } from "~/utils/file";
import Image from "next/image";
import Spin from "./spin";

interface Props {
  name?: string;
  onChange?: (files: FileList) => void; // Handler for file changes
  disabled?: boolean; // Disable input
  accept?: string; // Allowed file types
  max?: number;
}

interface FileUploadProps extends Props {
  value?: FileList; // Files managed by React Hook Form
}

const FileUpload: React.FC<FileUploadProps> = React.forwardRef(
  (
    {
      value: _value,
      onChange,
      disabled: _disabled = false,
      accept = ".jpg,.jpeg,.png", // Example: Limit to image files
      max,
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const value = _value ? Array.from(_value) : [];
    const count = value.length;
    const disabled = _disabled || (max ? count >= max : false);
    const onUpload = () => {
      if (inputRef.current) {
        inputRef.current.click();
      }
    };
    const previews = value.map((e) =>
      e instanceof File ? URL.createObjectURL(e) : e
    );

    return (
      <div className="flex flex-col gap-2">
        {/* <input
        name={name}
        type="file"
        multiple
        accept={accept} // Restrict file types
        disabled={disabled}
        onChange={handleFileChange}
        className="block w-full cursor-pointer rounded border border-gray-300 bg-gray-50 text-sm text-gray-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:placeholder-gray-400"
      /> */}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const newFiles = e.target.files; // FileList or null
            if (newFiles) {
              const newValues = [...value, ...Array.from(newFiles)];
              onChange?.(filesArrayToFileList(newValues));
            }
          }}
          multiple
          value={[]}
          disabled={disabled}
          max={max ? max - count : undefined}
        />
        <div className="flex items-center justify-between">
          <p
            className="mt-1 text-sm text-gray-500 dark:text-gray-300"
            id="file_input_help"
          >
            {`Accept files: ${accept}, maximum: ${max || "no limit"}`}
          </p>

          <Button
            variant={"outline"}
            onClick={onUpload}
            disabled={disabled}
            type="button"
            size={"sm"}
          >
            <ImagePlus />
            Add
          </Button>
        </div>
        {previews.length > 0 && (
          <div className="flex w-full gap-2 overflow-x-auto flex-wrap">
            {previews.map((src, index) => (
              <ImageBox
                key={index}
                onRemove={() => {
                  const newValues = value.slice();
                  newValues.splice(index, 1);
                  onChange?.(filesArrayToFileList(newValues));
                }}
              >
                <Image
                  src={src}
                  alt={`Preview ${index + 1}`}
                  className="rounded border border-gray-300 object-contain"
                  fill
                />
              </ImageBox>
            ))}
          </div>
        )}
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";

const ImageBox = ({
  children,
  onRemove,
}: {
  children: ReactNode;
  onRemove: () => void;
}) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="relative w-20 h-20"
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
    >
      <div
        className={cn(
          "actions absolute right-1 top-1 z-50",
          !hover && "hidden"
        )}
      >
        <Button type="button" onClick={onRemove} size={"sm"} icon>
          <Trash2 />
        </Button>
      </div>
      {children}
    </div>
  );
};

interface __Props extends Props {
  value: string; //File url
}

export const FileUploadPrepare = ({ value, ...props }: __Props) => {
  const [fileList, setFileList] = useState<FileList>();

  const fetchImage = () =>
    fetchFile(value)
      .then((value) => {
        setFileList(filesArrayToFileList([value]));
      })
      .catch();

  useEffect(() => {
    fetchImage();
  }, []);

  return !fileList ? (
    <Spin size={16} />
  ) : (
    <FileUpload value={fileList} {...props} />
  );
};

export { FileUpload };
