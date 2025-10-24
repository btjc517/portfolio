import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { ReactNode } from "react";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "./ui/item";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { RESUME_DATA } from "@/data/resume-data";

interface Props {
  title: string;
  description: string;
  icon: ReactNode;
  link?: string;
  idx: number;
}

export function ProjectCard({ title, description, icon, idx }: Props) {
  return (
    <Item variant="outline" className={`z-0 bg-background border-r ${((RESUME_DATA.achievements.length + 2) - idx == 1) || ((RESUME_DATA.achievements.length + 2) - idx == 2) || ((RESUME_DATA.achievements.length + 2) - idx == 3) ? "lg:border-b-0" : "lg:border-b"} ${((RESUME_DATA.achievements.length + 2) - idx == 1) || ((RESUME_DATA.achievements.length + 2) - idx == 2) ? "md:border-b-0" : "md:border-b"} border-t-0 border-l-0 rounded-none transition-all duration-300 overflow-hidden flex-col h-full`}>
      <div className="flex w-full h-full">
        <ItemContent className="flex flex-col ml-4 h-full">
          <ItemTitle className="flex flex-row justify-between w-full">
            <div className="flex items-center gap-2 text-md font-bold uppercase">
                <p className="text-muted-foreground">0{idx + 1}{" "}</p>
                {/* {icon} */}
                {title}
            </div>
            {/* <div className="flex flex-row items-center gap-2 font-light text-sm">
              <div className="flex flex-row items-center gap-1">
                <CalendarIcon className="size-4 text-muted-foreground stroke-1" /> 
                {education.start}{education.end && ` - ${education.end}`}
              </div>
              <Separator className="flex h-4 bg-muted-foreground/70 rounded-full ml-1" orientation="vertical" />
              <div className="flex flex-row items-center gap-1">
                <MapPinIcon className="size-4 text-muted-foreground stroke-1" />
                {education.location}
              </div>
            </div> */}
          </ItemTitle>
          {/* <ItemDescription className="mt-0.5"> */}
          <ItemDescription className="flex w-full mt-0.5 items-center overflow-visible">
            {/* <div className="flex flex-wrap gap-2"> */}
              {/* {(education as any).grades?.map((badge: string, idx: number) => (
                <Badge key={badge} variant="outline" className="text-xs text-primary rounded-sm font-normal border-none bg-primary/10" >
                  {badge}
                </Badge>
              ))} */}
              <span className="font-normal">
              {description}
              </span>
            {/* </div> */}
            {/* {education.liveWebsite && (
              <LinkPreview url={education.link} className="transition-all duration-300 cursor-pointer no-underline! overflow-visible">
                <Button variant="ghost" className="text-muted-foreground hover:text-primary flex items-center gap-2 text-xs font-light rounded-sm hover:ring hover:ring-border px-2 h-5.5!">
                  Website
                  <ArrowTopRightOnSquareIcon className="size-4" />
                </Button>
              </LinkPreview>
            )} */}
          </ItemDescription>
        </ItemContent>
      </div>
    </Item>
  );
}


