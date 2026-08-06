import React, { useState } from "react";
import Lands from "./Tab/Land";
import Coals from "./Tab/Coal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const TravelLogs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("Đất");

  return (
    <div className="flex flex-col h-full gap-4 p-4 md:p-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Danh mục</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Cung độ</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Nhật trình cung độ
        </h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
            <TabsTrigger value="Đất" className="font-semibold">
              Vận chuyển đất
            </TabsTrigger>
            <TabsTrigger value="Than" className="font-semibold">
              Vận chuyển than & SPNT
            </TabsTrigger>
          </TabsList>

          <TabsContent value="Đất" className="mt-4">
            <Lands type="Đất" />
          </TabsContent>

          <TabsContent value="Than" className="mt-4">
            <Coals type="Than" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TravelLogs;
