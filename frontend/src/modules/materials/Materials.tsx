import React, { useState } from "react";
import MaterialType from "./Tab/MaterialType";
import MaterialDensity from "./Tab/MaterialDensity";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const Materials: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("material");

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
            <BreadcrumbPage>Vật liệu</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Vật liệu
        </h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
            <TabsTrigger value="material" className="font-semibold">
              Loại vật liệu
            </TabsTrigger>
            <TabsTrigger value="density" className="font-semibold">
              Tỷ trọng vật liệu
            </TabsTrigger>
          </TabsList>

          <TabsContent value="material" className="mt-4">
            <MaterialType />
          </TabsContent>

          <TabsContent value="density" className="mt-4">
            <MaterialDensity />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Materials;