import Image from "next/image";
import redLogo from "../../wsu_red_white_bckgrd.png";
import whiteLogo from "../../wsu_white_white_bckgrd.png";
import redNoBackgroundLogo from "../../wsu_logo_red_no_background.jpg";

export default function WsuLogo({
  className,
  variant = "red",
}: {
  className: string;
  variant?: "red" | "white" | "red-no-background";
}) {
  return (
    <Image
      className={className}
      src={variant === "red-no-background" ? redNoBackgroundLogo : variant === "white" ? whiteLogo : redLogo}
      alt="Washington State University logo"
      sizes="64px"
    />
  );
}
