import React from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "~/components/ui/carousel";
import { Typography } from "~/components/ui/typography";

function Experiences({}) {
  return (
    <div className="mt-4">
      <Typography variant="h4">Becamex IDC</Typography>
      <Typography variant="h5" className="font-normal">
        March 2023 - present
      </Typography>
      <Carousel className="w-full max-w-[80%]  mx-auto mt-4">
        <CarouselContent>
          {Array.from({ length: 5 }).map((_, index) => (
            <CarouselItem key={index}>
              <div className="p-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Nha Trang</CardTitle>
                    <CardDescription>August 2024</CardDescription>
                  </CardHeader>
                  <CardContent className="flex relative aspect-square items-center justify-center p-6 max-h-[460px]">
                    <Image
                      alt="/img/smic-nha_trang.jpg"
                      fill
                      src={"/img/smic-nha_trang.jpg"}
                      className="object-contain rounded"
                    />
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}

export default Experiences;
