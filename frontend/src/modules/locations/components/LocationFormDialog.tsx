import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Location } from "@/types";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import LocationSelector from "@/fixLeafletIcon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const defaultCenter = {
  lat: 20.9926575,
  lng: 105.8437303,
};

export const locationSchema = z.object({
  name: z.string().min(1, "Tên điểm đổ tải không được để trống"),
  distance: z.coerce.number().min(0, "Phạm vi nhận diện phải >= 0"),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
});

export type LocationFormValues = z.infer<typeof locationSchema>;

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: Location | null;
  onSubmit: (values: LocationFormValues) => Promise<void>;
  isLoading?: boolean;
}

export const LocationFormDialog: React.FC<LocationFormDialogProps> = ({
  open,
  onOpenChange,
  location,
  onSubmit,
  isLoading = false,
}) => {
  const isEditing = Boolean(location);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema) as any,
    defaultValues: {
      name: "",
      distance: 0,
      coordinates: defaultCenter,
    },
  });

  useEffect(() => {
    if (open) {
      if (location) {
        let lat = defaultCenter.lat;
        let lng = defaultCenter.lng;

        const rawCoords = (location as any).coordinates;
        if (rawCoords && Array.isArray(rawCoords.coordinates)) {
          lng = rawCoords.coordinates[0];
          lat = rawCoords.coordinates[1];
        } else if (
          rawCoords &&
          typeof rawCoords.lat === "number" &&
          typeof rawCoords.lng === "number"
        ) {
          lat = rawCoords.lat;
          lng = rawCoords.lng;
        }

        const coordsObj = { lat, lng };
        setMapCoords(coordsObj);
        form.reset({
          name: location.name || "",
          distance: location.distance || 0,
          coordinates: coordsObj,
        });
      } else {
        setMapCoords(null);
        form.reset({
          name: "",
          distance: 0,
          coordinates: defaultCenter,
        });
      }
    }
  }, [open, location, form]);

  const handleSelectOnMap = (coords: { lat: number; lng: number }) => {
    setMapCoords(coords);
    form.setValue("coordinates", coords, { shouldValidate: true });
  };

  const handleSubmit = async (values: LocationFormValues) => {
    await onSubmit(values);
  };

  const currentCoords = form.watch("coordinates");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Sửa điểm đổ tải" : "Thêm điểm đổ tải mới"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Tên điểm đổ tải <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập tên điểm đổ tải" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="distance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phạm vi nhận diện (mét)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Nhập khoảng cách nhận diện (mét)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Input Tọa độ text */}
            <FormItem>
              <FormLabel>Tọa độ (lng, lat)</FormLabel>
              <FormControl>
                <Input
                  value={
                    currentCoords
                      ? `${currentCoords.lng}, ${currentCoords.lat}`
                      : ""
                  }
                  onChange={(e) => {
                    const parts = e.target.value.split(",");
                    if (parts.length === 2) {
                      const lng = parseFloat(parts[0].trim());
                      const lat = parseFloat(parts[1].trim());
                      if (!isNaN(lat) && !isNaN(lng)) {
                        const coords = { lat, lng };
                        setMapCoords(coords);
                        form.setValue("coordinates", coords, {
                          shouldValidate: true,
                        });
                      }
                    }
                  }}
                  placeholder="Kinh độ (lng), Vĩ độ (lat)"
                />
              </FormControl>
            </FormItem>

            {/* Leaflet Map Picker */}
            <div className="rounded-lg overflow-hidden border border-border h-[260px] w-full">
              <MapContainer
                center={[
                  mapCoords?.lat ?? defaultCenter.lat,
                  mapCoords?.lng ?? defaultCenter.lng,
                ]}
                zoom={16}
                style={{ width: "100%", height: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                <LocationSelector onSelect={handleSelectOnMap} />
                {mapCoords && <Marker position={mapCoords} />}
              </MapContainer>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Cập nhật" : "Thêm mới"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
