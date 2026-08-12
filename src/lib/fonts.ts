import {
  Inter,
  Lato,
  Montserrat,
  Nunito,
  Open_Sans,
  Oswald,
  Outfit,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Poppins,
  Raleway,
  Roboto,
  Source_Sans_3,
} from "next/font/google";
export { normalizeThemeFontFamily } from "@/lib/font-families";

export const outfitFont = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-outfit",
});

export const plusJakartaSansFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-plus-jakarta-sans",
});

export const interFont = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  preload: false,
  variable: "--font-inter",
});

export const montserratFont = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  preload: false,
  variable: "--font-montserrat",
});

export const nunitoFont = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  preload: false,
  variable: "--font-nunito",
});

export const openSansFont = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-open-sans",
});

export const oswaldFont = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-oswald",
});

export const playfairDisplayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  preload: false,
  variable: "--font-playfair-display",
});

export const poppinsFont = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  preload: false,
  variable: "--font-poppins",
});

export const ralewayFont = Raleway({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  preload: false,
  variable: "--font-raleway",
});

export const robotoFont = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
  variable: "--font-roboto",
});

export const sourceSans3Font = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-source-sans-3",
});

export const latoFont = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
  variable: "--font-lato",
});

export const appFontVariables = [
  outfitFont.variable,
  plusJakartaSansFont.variable,
  interFont.variable,
  montserratFont.variable,
  nunitoFont.variable,
  openSansFont.variable,
  oswaldFont.variable,
  playfairDisplayFont.variable,
  poppinsFont.variable,
  ralewayFont.variable,
  robotoFont.variable,
  sourceSans3Font.variable,
  latoFont.variable,
].join(" ");
