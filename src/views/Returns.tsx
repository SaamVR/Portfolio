import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { RefreshCcw, ShieldCheck, Clock, CheckCircle } from "lucide-react";
import { useOptionalStore } from "@/components/storefront/store-context";

const Returns = () => {
  const currentStore = useOptionalStore();
  const storeName = currentStore?.name ?? "our store";
  return (
    <Layout>
      <SEOHead 
        title="Returns & Exchanges" 
        description={`${storeName}'s 7-day return and exchange policy.`} 
      />
      
      <div className="container mx-auto max-w-4xl px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl font-bold text-foreground mb-4">Returns & Exchanges</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            We want you to love what you ordered. If something isn't right, we've made our return and exchange process as simple as possible.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-card border border-border p-6 rounded-lg text-center">
            <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="font-heading font-bold text-lg mb-2">7-Day Guarantee</h3>
            <p className="text-muted-foreground text-sm">
              You have 7 days from the date of delivery to request a return or exchange.
            </p>
          </div>
          
          <div className="bg-card border border-border p-6 rounded-lg text-center">
            <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="font-heading font-bold text-lg mb-2">Original Condition</h3>
            <p className="text-muted-foreground text-sm">
              Items must be unworn, unwashed, and have original tags attached.
            </p>
          </div>

          <div className="bg-card border border-border p-6 rounded-lg text-center">
            <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCcw className="h-6 w-6" />
            </div>
            <h3 className="font-heading font-bold text-lg mb-2">Easy Process</h3>
            <p className="text-muted-foreground text-sm">
              We arrange pickup for exchanges. No need to visit a courier office yourself.
            </p>
          </div>
        </div>

        <div className="space-y-12">
          <section>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4 border-b border-border pb-2">How to Request an Exchange</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">1</div>
                <div>
                  <h4 className="font-bold text-foreground">Message Us</h4>
                  <p className="text-muted-foreground">Send us a message through the store's support channel with your Order ID and photos of the product.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">2</div>
                <div>
                  <h4 className="font-bold text-foreground">Verification</h4>
                  <p className="text-muted-foreground">Our team will verify your request within 24 hours.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">3</div>
                <div>
                  <h4 className="font-bold text-foreground">Doorstep Swap</h4>
                  <p className="text-muted-foreground">We can coordinate an exchange handoff or return shipment based on the fulfillment options available for your order.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4 border-b border-border pb-2">Refund Policy</h2>
            <p className="text-muted-foreground mb-4">
              We offer full refunds in the following scenarios:
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
                <strong>Note:</strong> We do not offer cash refunds for "change of mind" or sizing issues. In these cases, we happily offer a size exchange or store credit.
              </p>
            </div>
          </section>
          
          <section>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4 border-b border-border pb-2">Non-Returnable Items</h2>
            <p className="text-muted-foreground">
              For hygiene reasons, the following items cannot be returned or exchanged:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
              <li>Underwear & Boxers</li>
              <li>Socks</li>
              <li>Items bought during clearance sales</li>
            </ul>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default Returns;
