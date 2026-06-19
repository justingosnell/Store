import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StateFilterProps {
  selectedState: string;
  onStateChange: (state: string) => void;
}

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const STATE_NAMES: Record<string, string> = {
  "AL": "Alabama",
  "AK": "Alaska",
  "AZ": "Arizona",
  "AR": "Arkansas",
  "CA": "California",
  "CO": "Colorado",
  "CT": "Connecticut",
  "DE": "Delaware",
  "FL": "Florida",
  "GA": "Georgia",
  "HI": "Hawaii",
  "ID": "Idaho",
  "IL": "Illinois",
  "IN": "Indiana",
  "IA": "Iowa",
  "KS": "Kansas",
  "KY": "Kentucky",
  "LA": "Louisiana",
  "ME": "Maine",
  "MD": "Maryland",
  "MA": "Massachusetts",
  "MI": "Michigan",
  "MN": "Minnesota",
  "MS": "Mississippi",
  "MO": "Missouri",
  "MT": "Montana",
  "NE": "Nebraska",
  "NV": "Nevada",
  "NH": "New Hampshire",
  "NJ": "New Jersey",
  "NM": "New Mexico",
  "NY": "New York",
  "NC": "North Carolina",
  "ND": "North Dakota",
  "OH": "Ohio",
  "OK": "Oklahoma",
  "OR": "Oregon",
  "PA": "Pennsylvania",
  "RI": "Rhode Island",
  "SC": "South Carolina",
  "SD": "South Dakota",
  "TN": "Tennessee",
  "TX": "Texas",
  "UT": "Utah",
  "VT": "Vermont",
  "VA": "Virginia",
  "WA": "Washington",
  "WV": "West Virginia",
  "WI": "Wisconsin",
  "WY": "Wyoming"
};

export function StateFilter({ selectedState, onStateChange }: StateFilterProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <h2 className="luckiest-guy-regular text-xl font-semibold">Filter by State</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select a state to filter locations
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <Button
          variant={selectedState === "" ? "default" : "ghost"}
          className="w-full justify-start"
          onClick={() => onStateChange("")}
          data-testid="button-state-all"
        >
          <MapPin className="h-4 w-4 mr-2" />
          All States
        </Button>

        <div className="grid grid-cols-2 gap-2 mt-4">
          {US_STATES.map((state) => (
            <Button
              key={state}
              variant={selectedState === state ? "default" : "outline"}
              className="text-sm"
              onClick={() => onStateChange(state)}
              data-testid={`button-state-${state}`}
            >
              {state}
            </Button>
          ))}
        </div>
      </div>

      {selectedState && (
        <div className="p-4 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onStateChange("")}
            data-testid="button-clear-state"
          >
            Clear Filter
          </Button>
        </div>
      )}
    </div>
  );
}