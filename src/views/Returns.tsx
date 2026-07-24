import Layout from "@/components/Layout";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import { StorefrontBlockRenderer } from "@/components/storefront/StorefrontBlockRenderer";
import SEOHead from "@/components/SEOHead";
import { RefreshCcw, ShieldCheck, Clock, CheckCircle } from "lucide-react";
import { useOptionalStore } from "@/components/storefront/store-context";
import { absoluteStoreUrl } from "@/lib/siteUrl";

const Returns = () => {
  const currentStore = useOptionalStore();
  const storeName = currentStore?.name ?? "our store";
  const returnWindowLabel = `${storeName}'s current return and exchange window`;
  const LayoutWrapper = currentStore?.id ? StorefrontLayout : Layout;
  const policyPage = currentStore?.pages.find((page) => page.slug === "/returns" || page.slug === "/policy");
  const policyBlocks = policyPage ? [...policyPage.blocks].sort((a, b) => a.sortOrder - b.sortOrder) : [];

  if (policyPage && policyBlocks.length > 0) {
    return (
      <LayoutWrapper>
        <SEOHead
          title={policyPage.seoTitle || policyPage.title}
          description={policyPage.seoDescription || `${storeName}'s return, exchange, and refund guidelines.`}
          canonical={absoluteStoreUrl(currentStore, "/returns")}
        />
        <div className="py-8">
          {policyBlocks.map((block) => (
            <div key={block.id}>
              <StorefrontBlockRenderer block={block} />
            </div>
          ))}
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <SEOHead 
        title="Returns & Exchanges" 
        description={`${storeName}'s return, exchange, and refund guidelines.`} 
        canonical={absoluteStoreUrl(currentStore, "/returns")}
      />
      
      <div className="container mx-auto max-w-4xl px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl font-bold text-foreground mb-4">Returns & Exchanges</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            If something is not right with your order, {storeName} aims to make support, returns, and exchanges clear and easy to follow.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-card border border-border p-6 rounded-lg text-center">
            <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="font-heading font-bold text-lg mb-2">Return Window</h3>
            <p className="text-muted-foreground text-sm">
              Use this page as the current reference for when return or exchange requests should be submitted after delivery.
            </p>
          </div>
          
          <div className="bg-card border border-border p-6 rounded-lg text-center">
            <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="font-heading font-bold text-lg mb-2">Original Condition</h3>
            <p className="text-muted-foreground text-sm">
              Eligible items usually need to stay unused, undamaged, and in their original condition with any required packaging or tags.
            </p>
          </div>

          <div className="bg-card border border-border p-6 rounded-lg text-center">
            <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCcw className="h-6 w-6" />
            </div>
            <h3 className="font-heading font-bold text-lg mb-2">Support Guidance</h3>
            <p className="text-muted-foreground text-sm">
              The store team will confirm the next step, whether that means an exchange, a return shipment, or another support option.
            </p>
          </div>
        </div>

        <div className="space-y-12">
          <section>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4 border-b border-border pb-2">How to Request Help</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">1</div>
                <div>
                  <h4 className="font-bold text-foreground">Contact {storeName}</h4>
                  <p className="text-muted-foreground">Send us a message through the store's support channel with your Order ID and photos of the product.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">2</div>
                <div>
                  <h4 className="font-bold text-foreground">Verification</h4>
                  <p className="text-muted-foreground">The team will review the request details and confirm the best next step for your order.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">3</div>
                <div>
                  <h4 className="font-bold text-foreground">Resolution</h4>
                  <p className="text-muted-foreground">We can coordinate an exchange handoff or return shipment based on the fulfillment options available for your order.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4 border-b border-border pb-2">Refund Policy</h2>
            <p className="text-muted-foreground mb-4">
              Refunds may be approved when the order or item does not match what the customer reasonably expected to receive, such as:
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">You received a defective or damaged product.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">You received the wrong item (different from what you ordered).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">The product does not match the description on our website.</span>
              </li>
            </ul>
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                <strong>Note:</strong> Final approval can depend on product condition, category rules, and the store's support review. If you are unsure, contact {storeName} before sending anything back.
              </p>
            </div>
          </section>
          
          <section>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4 border-b border-border pb-2">Non-Returnable Items</h2>
            <p className="text-muted-foreground">
              Some categories may be limited or excluded from returns for hygiene, customization, clearance, or supplier-policy reasons. Common examples include:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
              <li>Underwear & Boxers</li>
              <li>Socks</li>
              <li>Items bought during clearance sales</li>
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">{returnWindowLabel} and exclusions should take priority if this store has customized them.</p>
          </section>
        </div>
      </div>
    </LayoutWrapper>
  );
};

export default Returns;
