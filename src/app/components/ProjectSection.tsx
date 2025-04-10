import Image from "next/image";
import React from "react";
import { Typography } from "~/components/ui/typography";

function ProjectSection({}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="card border rounded-lg overflow-hidden">
        <div className="w-full h-40 relative">
          <Image
            src={
              "https://vinahost.vn/wp-content/uploads/2024/08/google-site-la-gi-17.jpg"
            }
            alt="img"
            fill
          />
        </div>

        <div className="p-4">
          <Typography variant={"h3"} className="uppercase">
            [EMS]
          </Typography>
          <Typography variant={"p"}>
            An energy management system (electricity, gas and water) to ensure
            they are used efficiently
          </Typography>
          <Typography variant={"h5"}>Role: Frontend</Typography>
          <Typography variant={"h5"}>Technology: Reactjs</Typography>
        </div>
      </div>
    </div>
  );
}

export default ProjectSection;
