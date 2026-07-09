import tshirtBlack from "@/assets/tshirt-black.jpg";
import tshirtWhite from "@/assets/tshirt-white.jpg";
import tshirtOlive from "@/assets/tshirt-olive.jpg";
import tshirtNavy from "@/assets/tshirt-navy.jpg";
import tshirtBurgundy from "@/assets/tshirt-burgundy.jpg";
import tshirtGrey from "@/assets/tshirt-grey.jpg";
import poloBlack from "@/assets/polo-black.jpg";
import poloNavy from "@/assets/polo-navy.jpg";
import shirtWhite from "@/assets/shirt-white.jpg";
import shirtOlive from "@/assets/shirt-olive.jpg";
import dropshoulderGrey from "@/assets/dropshoulder-grey.jpg";
import dropshoulderBurgundy from "@/assets/dropshoulder-burgundy.jpg";
import dropshoulderBlack from "@/assets/dropshoulder-black.jpg";
import vestWhite from "@/assets/vest-white.jpg";
import boxerBlack from "@/assets/boxer-black.jpg";
import trunkGrey from "@/assets/trunk-grey.jpg";
import joggersBlack from "@/assets/joggers-black.jpg";
import chinosNavy from "@/assets/chinos-navy.jpg";
import cargoOlive from "@/assets/cargo-olive.jpg";
import trousersGrey from "@/assets/trousers-grey.jpg";
import type { StaticImageData } from "next/image";

const imageMap: Record<string, StaticImageData> = {
  "tshirt-black.jpg": tshirtBlack,
  "tshirt-white.jpg": tshirtWhite,
  "tshirt-olive.jpg": tshirtOlive,
  "tshirt-navy.jpg": tshirtNavy,
  "tshirt-burgundy.jpg": tshirtBurgundy,
  "tshirt-grey.jpg": tshirtGrey,
  "polo-black.jpg": poloBlack,
  "polo-navy.jpg": poloNavy,
  "shirt-white.jpg": shirtWhite,
  "shirt-olive.jpg": shirtOlive,
  "dropshoulder-grey.jpg": dropshoulderGrey,
  "dropshoulder-burgundy.jpg": dropshoulderBurgundy,
  "dropshoulder-black.jpg": dropshoulderBlack,
  "vest-white.jpg": vestWhite,
  "boxer-black.jpg": boxerBlack,
  "trunk-grey.jpg": trunkGrey,
  "joggers-black.jpg": joggersBlack,
  "chinos-navy.jpg": chinosNavy,
  "cargo-olive.jpg": cargoOlive,
  "trousers-grey.jpg": trousersGrey,
};

export function resolveImageUrl(url: string): string {
  if (!url) return "/placeholder.svg";
  if (url.startsWith("http") || url.startsWith("/") || url.startsWith("data:")) return url;
  return imageMap[url]?.src || url;
}
