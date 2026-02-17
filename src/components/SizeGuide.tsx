import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ProductType } from "@/data/products";
import { cn } from "@/lib/utils";

interface SizeGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type GuideCategory = ProductType | "General";

const categories: { label: string; value: GuideCategory }[] = [
  { label: "T-Shirts", value: "T-Shirt" },
  { label: "Polos", value: "Polo" },
  { label: "Shirts", value: "Shirt" },
  { label: "Drop Shoulders", value: "Drop Shoulder" },
  { label: "Undergarments", value: "Undergarment" },
  { label: "Pants", value: "Pants" },
];

interface SizeRow {
  size: string;
  chest?: string;
  waist?: string;
  length?: string;
  hip?: string;
  shoulder?: string;
  inseam?: string;
}

const sizeData: Record<GuideCategory, { columns: string[]; rows: SizeRow[] }> = {
  "T-Shirt": {
    columns: ["Size", "Chest", "Length", "Shoulder"],
    rows: [
      { size: "S", chest: "36\"", length: "26\"", shoulder: "16.5\"" },
      { size: "M", chest: "38\"", length: "27\"", shoulder: "17\"" },
      { size: "L", chest: "40\"", length: "28\"", shoulder: "17.5\"" },
      { size: "XL", chest: "42\"", length: "29\"", shoulder: "18\"" },
      { size: "XXL", chest: "44\"", length: "30\"", shoulder: "18.5\"" },
    ],
  },
  Polo: {
    columns: ["Size", "Chest", "Length", "Shoulder"],
    rows: [
      { size: "S", chest: "36\"", length: "26.5\"", shoulder: "16.5\"" },
      { size: "M", chest: "38\"", length: "27.5\"", shoulder: "17\"" },
      { size: "L", chest: "40\"", length: "28.5\"", shoulder: "17.5\"" },
      { size: "XL", chest: "42\"", length: "29.5\"", shoulder: "18\"" },
      { size: "XXL", chest: "44\"", length: "30.5\"", shoulder: "18.5\"" },
    ],
  },
  Shirt: {
    columns: ["Size", "Chest", "Length", "Shoulder"],
    rows: [
      { size: "S", chest: "37\"", length: "28\"", shoulder: "16.5\"" },
      { size: "M", chest: "39\"", length: "29\"", shoulder: "17\"" },
      { size: "L", chest: "41\"", length: "30\"", shoulder: "17.5\"" },
      { size: "XL", chest: "43\"", length: "31\"", shoulder: "18\"" },
    ],
  },
  "Drop Shoulder": {
    columns: ["Size", "Chest", "Length", "Shoulder"],
    rows: [
      { size: "S", chest: "40\"", length: "27\"", shoulder: "20\"" },
      { size: "M", chest: "42\"", length: "28\"", shoulder: "21\"" },
      { size: "L", chest: "44\"", length: "29\"", shoulder: "22\"" },
      { size: "XL", chest: "46\"", length: "30\"", shoulder: "23\"" },
    ],
  },
  Undergarment: {
    columns: ["Size", "Waist", "Hip"],
    rows: [
      { size: "S", waist: "28-30\"", hip: "34-36\"" },
      { size: "M", waist: "30-32\"", hip: "36-38\"" },
      { size: "L", waist: "32-34\"", hip: "38-40\"" },
      { size: "XL", waist: "34-36\"", hip: "40-42\"" },
      { size: "XXL", waist: "36-38\"", hip: "42-44\"" },
    ],
  },
  Pants: {
    columns: ["Size", "Waist", "Hip", "Inseam"],
    rows: [
      { size: "S / 30", waist: "30\"", hip: "36\"", inseam: "30\"" },
      { size: "M / 32", waist: "32\"", hip: "38\"", inseam: "31\"" },
      { size: "L / 34", waist: "34\"", hip: "40\"", inseam: "31\"" },
      { size: "XL / 36", waist: "36\"", hip: "42\"", inseam: "32\"" },
      { size: "XXL / 38", waist: "38\"", hip: "44\"", inseam: "32\"" },
    ],
  },
  General: { columns: [], rows: [] },
};

const getRowValue = (row: SizeRow, col: string): string => {
  const key = col.toLowerCase() as keyof SizeRow;
  return (row[key] as string) || "—";
};

const SizeGuide = ({ open, onOpenChange }: SizeGuideProps) => {
  const [activeCategory, setActiveCategory] = useState<GuideCategory>("T-Shirt");
  const data = sizeData[activeCategory];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border sm:rounded-xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold text-foreground">
            Size Guide
          </DialogTitle>
        </DialogHeader>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 border-b border-border pb-4">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium smooth-hover transition-all duration-300",
                activeCategory === cat.value
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Measurement table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {data.columns.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr
                  key={row.size}
                  className="border-b border-border/50 transition-colors hover:bg-secondary/50"
                >
                  {data.columns.map((col) => (
                    <td
                      key={col}
                      className={cn(
                        "px-4 py-3",
                        col === "Size" ? "font-semibold text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {getRowValue(row, col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tips */}
        <div className="mt-2 space-y-1.5 rounded-lg bg-secondary/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground">How to Measure</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Chest:</strong> Measure around the fullest part of your chest, keeping the tape level.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Waist:</strong> Measure around your natural waistline, above the hip bone.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Length:</strong> Measure from the highest point of the shoulder to the bottom hem.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            All measurements are approximate. For the best fit, we recommend going one size up if you're between sizes.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SizeGuide;
