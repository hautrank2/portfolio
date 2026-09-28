export type CvContactActionsProps = {
  name: string;
  phone: string;
  email: string;
  /** The generated PDF, e.g. `/cv/pdf`. */
  pdfHref: string;
  /** Show the copy-phone / copy-email row. Off where space is tight. */
  showCopy?: boolean;
  /** Size of the main buttons. `sm` fits a narrow sidebar. */
  size?: "sm" | "lg";
};

export type UseCvContactActionsProps = CvContactActionsProps & {};

/** Which value was just copied — drives the "Copied" tick on that button. */
export type CvCopiedField = "phone" | "email" | "link";
