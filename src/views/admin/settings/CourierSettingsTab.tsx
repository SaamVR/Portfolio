import { TabsContent } from "@/components/ui/tabs";
import CouriersPluginManager from "@/views/admin/CouriersPluginManager";

export function CourierSettingsTab() {
  return (
    <TabsContent value="couriers" className="mt-0">
      <CouriersPluginManager />
    </TabsContent>
  );
}
