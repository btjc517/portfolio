export interface WorkExperience {
    company: string;
    companyDescription?: string;
    liveWebsite?: boolean;
    animatedLogo?: React.ReactNode;
    logo?: string;
    location?: string;
    title?: string;
    shortDescription?: string;
    description?: string;
    start?: string;
    end?: string;
    link: string;
    badges: readonly string[] | string[];
    star_tag?: readonly string[] | string[];
    workType?: string;
    lineItems?: readonly string[];
    techBadges?: readonly string[];
  }
  