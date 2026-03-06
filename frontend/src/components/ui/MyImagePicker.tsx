import type { ReactNode } from "react";
import type { AssetDto } from "@/services/assetService";
import MyModelPicker from "@/components/ui/MyModelPicker";

type Props = {
  assets: AssetDto[];
  loading: boolean;
  selectedIds: string[];
  onChangeSelectedIds: (ids: string[]) => void;
  onUpload?: () => void;
  onRefresh?: () => void;
  onClear?: () => void;
  title?: string;
  emptyText?: string;
  multi?: boolean;
  readOnlyList?: boolean;
  renderItemActions?: (asset: AssetDto) => ReactNode;
  renderItemSubtitle?: (asset: AssetDto) => ReactNode;
  searchPlaceholder?: string;
  className?: string;
  gridCols?: 2 | 3;
  listMaxHeightClass?: string;
};

export default function MyImagePicker({
  title = "Images",
  emptyText = "No images in your library.",
  searchPlaceholder = "Search images...",
  ...rest
}: Props) {
  return (
    <MyModelPicker
      title={title}
      emptyText={emptyText}
      searchPlaceholder={searchPlaceholder}
      {...rest}
    />
  );
}

