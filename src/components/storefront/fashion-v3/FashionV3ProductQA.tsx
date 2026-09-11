"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/auth-context";
import { useOptionalStore } from "@/components/storefront/store-context";
import { supabase } from "@/integrations/supabase/client";
import { isUuid } from "@/lib/slug";
import { useNavigate } from "@/lib/react-router-dom-shim";
import { buildCustomerAuthPath, getCurrentRelativePath } from "@/lib/storefront-customer-access";

export function FashionV3ProductQA({ productId }: { productId: string }) {
  const { user } = useAuth();
  const store = useOptionalStore();
  const storeId = store?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState("");

  const { data: qas = [], isLoading } = useQuery({
    queryKey: ["product-qa", productId, storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      if (!isUuid(productId) || !storeId) return [];
      const { data, error } = await supabase.from("product_qa" as any).select("*").eq("store_id", storeId).eq("product_id", productId).order("created_at", { ascending: false });
      if (error) return [];
      return data ?? [];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!isUuid(productId) || !storeId || !user) throw new Error("Question unavailable");
      const { error } = await supabase.from("product_qa" as any).insert({ product_id: productId, user_id: user.id, question: question.trim(), store_id: storeId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-qa", productId, storeId] });
      setQuestion("");
      toast.success("Question submitted");
    },
    onError: () => toast.error("Could not submit the question"),
  });

  const handleSubmit = () => {
    if (!user) {
      toast.info("Sign in to ask a question");
      navigate(buildCustomerAuthPath(getCurrentRelativePath(), store?.slug));
      return;
    }
    if (question.trim()) submit.mutate();
  };

  return (
    <section className="border-t border-border py-14 md:py-20">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 md:grid-cols-[0.72fr_1.28fr] md:px-8">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Product help</p>
          <h2 className="text-3xl font-semibold tracking-[-0.04em]">Questions & answers</h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Ask about fit, material, sizing, care, or delivery.</p>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={300} placeholder="Ask a question" className="mt-6 min-h-28 w-full resize-none border border-border bg-transparent p-4 text-sm outline-none focus:border-primary" />
          {!user ? <p className="mt-2 text-xs text-muted-foreground">You’ll be asked to sign in before submitting.</p> : null}
          <button onClick={handleSubmit} disabled={!question.trim() || submit.isPending} className="mt-3 min-h-11 bg-primary px-6 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground disabled:bg-primary/25">{submit.isPending ? "Submitting" : "Ask question"}</button>
        </div>
        <div className="border-t border-border">
          {isLoading ? <p className="py-6 text-sm text-muted-foreground">Loading questions…</p> : qas.length === 0 ? <div className="py-8"><p className="text-sm font-medium">No questions yet.</p><p className="mt-1 text-sm text-muted-foreground">Be the first to ask about this item.</p></div> : qas.map((qa: any) => <article key={qa.id} className="border-b border-border py-6"><p className="text-sm font-semibold">{qa.question}</p><p className="mt-2 text-[11px] text-muted-foreground">Asked {new Date(qa.created_at).toLocaleDateString()}</p>{qa.answer ? <div className="mt-5 border-l border-border pl-4"><p className="text-sm leading-6 text-foreground/70">{qa.answer}</p><p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{store?.name || "Store"}</p></div> : null}</article>)}
        </div>
      </div>
    </section>
  );
}
