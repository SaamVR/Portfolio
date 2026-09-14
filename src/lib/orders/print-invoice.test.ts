import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { escapePrintableHtml, escapePrintableHtmlWithBreaks } from "@/lib/orders/print-invoice";

test("printable invoice escaping neutralizes HTML and event-handler payloads", () => {
  const hostile = `<img src=x onerror="globalThis.pwned=true"><script>alert('x')</script>&`;
  const escaped = escapePrintableHtml(hostile);

  assert.equal(
    escaped,
    "&lt;img src=x onerror=&quot;globalThis.pwned=true&quot;&gt;&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;&amp;",
  );
  assert.doesNotMatch(escaped, /<img|<script/i);
});

test("multiline notes preserve only explicit line-break markup after escaping", () => {
  const escaped = escapePrintableHtmlWithBreaks("TrxID: ABC123\n<script>alert(1)</script>");

  assert.equal(escaped, "TrxID: ABC123<br>&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.doesNotMatch(escaped, /<script/i);
});

test("admin invoice printer routes every shopper-controlled text field through output encoding", () => {
  const source = readFileSync(path.join(process.cwd(), "src/views/admin/Orders.tsx"), "utf8");

  assert.match(source, /escapePrintableHtml/);
  assert.match(source, /escapePrintableHtmlWithBreaks/);
  assert.match(source, /safeText\(item\.name\)/);
  assert.match(source, /safeText\(item\.size\)/);
  assert.match(source, /safeText\(order\.customer_name\)/);
  assert.match(source, /safeText\(order\.customer_phone\)/);
  assert.match(source, /safeText\(order\.customer_email/);
  assert.match(source, /safeText\(order\.shipping_address\)/);
  assert.match(source, /safeText\(order\.shipping_city\)/);
  assert.match(source, /safeNotes\(order\.notes\)/);
});
