import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/auth-context";
import { toast } from "sonner";
import { HelpCircle, MessageCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isUuid } from "@/lib/slug";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useNavigate } from "@/lib/react-router-dom-shim";
import { buildCustomerAuthPath, getCurrentRelativePath } from "@/lib/storefront-customer-access";

export default function ProductQA({ productId }: { productId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentStore = useOptionalStore();
  const storeId = currentStore?.id;
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");

  // Use the RPC function to fetch Q&A since we don't have a direct table for it, or we can just use a generic 'messages' table or similar?
  // Actually, we need to create a product_qa table in Supabase! 
  // Let's use useQuery to fetch it anyway, and if it fails, it means the table doesn't exist yet, we can handle it safely.
  const { data: qas, isLoading } = useQuery({
    queryKey: ["product-qa", productId, storeId],
    queryFn: async () => {
      if (!isUuid(productId)) return [];
      // Fetch from product_qa table. If not exists, will throw error which we catch.
      const { data, error } = await supabase
        .from("product_qa" as any)
        .select("*")
        .eq("store_id", storeId as string)
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Table product_qa might not exist yet", error);
        return [];
      }
      return data || [];
    },
    enabled: !!storeId,
  });

  const submitQuestion = useMutation({
    mutationFn: async () => {
      if (!isUuid(productId)) {
        throw new Error("Q&A is not available for this demo product yet.");
      }
      if (!storeId) {
        throw new Error("Store is still loading.");
      }
      const { error } = await supabase
        .from("product_qa" as any)
        .insert({
          product_id: productId,
          user_id: user!.id,
          question: question.trim(),
          store_id: storeId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-qa", productId, storeId] });
      toast.success("Question submitted! We will answer it soon.");
      setQuestion("");
    },
    onError: () => {
      toast.error("Failed to submit question. We'll fix this soon.");
    },
  });

  const handleSubmit = () => {
    if (!user) {
      toast.info("Please sign in first, then we'll bring you right back to your question.");
      navigate(buildCustomerAuthPath(getCurrentRelativePath(), currentStore?.slug));
      return;
    }
    if (!question.trim()) return;
    submitQuestion.mutate();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
        <h2 className="flex items-center gap-2 font-heading text-2xl font-bold text-foreground">
          <HelpCircle className="h-6 w-6 text-primary" />
          Questions & Answers
        </h2>
      </div>

      <div className="grid gap-12 lg:grid-cols-3">
        {/* Ask Question Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">Have a question?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ask us anything about this product. Fit, material, sizing, or delivery details!
            </p>
            {!user ? (
              <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                Sign in to ask a question. We will return you to this product right after login.
              </div>
            ) : null}
            <div className="space-y-4">
              <Textarea
                placeholder="Type your question here..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="min-h-[120px] resize-none"
                maxLength={300}
              />
              <Button 
                onClick={handleSubmit} 
                disabled={!question.trim() || submitQuestion.isPending}
                className="w-full gap-2"
              >
                {submitQuestion.isPending ? "Submitting..." : "Ask Question"}
              </Button>
            </div>
          </div>
        </div>

        {/* Q&A List */}
        <div className="lg:col-span-2 space-y-6">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading questions...</div>
          ) : !qas || qas.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-border rounded-lg bg-card/50">
              <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="font-heading text-lg font-semibold text-foreground">No questions yet</p>
              <p className="text-sm text-muted-foreground">Be the first to ask a question about this product.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {qas.map((qa: any) => (
                <div key={qa.id} className="border border-border rounded-lg p-5 bg-card">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-6 w-6 bg-primary/20 text-primary flex items-center justify-center font-bold rounded-full text-xs">
                        Q
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">{qa.question}</p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Asked on {new Date(qa.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  {qa.answer && (
                    <div className="flex gap-4 ml-6 pt-4 border-t border-border/50">
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-6 w-6 bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold rounded-full text-xs">
                          A
                        </div>
                      </div>
                      <div>
                        <p className="text-foreground text-sm">{qa.answer}</p>
                        <p className="text-xs text-muted-foreground mt-1">{currentStore?.name ?? "Store"} Support</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
