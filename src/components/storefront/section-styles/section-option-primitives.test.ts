import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveSectionAlignment,
  resolveSectionEmphasis,
  resolveSectionMediaFit,
  resolveSectionMobileBehavior,
  resolveSectionOptionClasses,
  resolveSectionSpacing,
  resolveSectionWidth,
} from "./section-option-primitives";

test("R4 section primitives resolve canonical options deterministically", () => {
  assert.deepEqual(resolveSectionAlignment("center"), {
    textClassName: "text-center",
    itemsClassName: "items-center",
    marginClassName: "mx-auto",
    justifyClassName: "justify-center",
  });
  assert.equal(resolveSectionWidth("narrow"), "max-w-3xl");
  assert.equal(resolveSectionSpacing("compact"), "py-8 sm:py-8 md:py-12 lg:py-12");
  assert.equal(resolveSectionMediaFit("contain"), "object-contain");
  assert.deepEqual(resolveSectionEmphasis("strong"), {
    titleClassName: "font-black",
    copyClassName: "font-medium",
  });
});
test("absence emits no presentation modifiers", () => {
  assert.deepEqual(resolveSectionOptionClasses(undefined), {
    alignment: {
      textClassName: "",
      itemsClassName: "",
      marginClassName: "",
      justifyClassName: "",
    },
    contentWidthClassName: "",
    mediaFitClassName: "",
    emphasis: { titleClassName: "", copyClassName: "" },
    spacingClassName: "",
    mobile: {
      mode: null,
      isStack: false,
      isScroll: false,
      isCompact: false,
    },
  });
});

test("mobile behavior is bounded to approved semantic modes", () => {
  assert.equal(resolveSectionMobileBehavior("stack").isStack, true);
  assert.equal(resolveSectionMobileBehavior("scroll").isScroll, true);
  assert.equal(resolveSectionMobileBehavior("compact").isCompact, true);
  assert.equal(resolveSectionMobileBehavior(undefined).mode, null);
});
