
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
// Ensure correct path for utils
import { cn } from "@/lib/utils"; 
import { Link } from "react-router-dom";

interface ActionCardProps {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  icon?: React.ReactNode;
  variant?: "default" | "prominent";
  className?: string;
}

export function ActionCard({
  title,
  description,
  actionLabel,
  actionHref,
  icon,
  variant = "default",
  className
}: ActionCardProps) {
  return (
    <Card className={cn(
      variant === "prominent" && "border-primary border-2 bg-accent",
      className
    )}>
      <CardHeader className="pb-3">
        {icon && <div className="mb-2 text-primary">{icon}</div>}
        <CardTitle className="flex justify-between items-center">
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter className="pt-3">
        <Button 
          asChild 
          variant={variant === "prominent" ? "default" : "outline"}
          className={variant === "prominent" ? "w-full" : ""}
        >
          <Link to={actionHref}>
            {actionLabel}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
