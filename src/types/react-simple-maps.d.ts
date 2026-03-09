declare module "react-simple-maps" {
  import type { ComponentType, CSSProperties, ReactNode } from "react";

  interface ProjectionConfig {
    scale?: number;
    center?: [number, number];
    rotate?: [number, number, number];
  }

  interface ComposableMapProps {
    projection?: string;
    projectionConfig?: ProjectionConfig;
    width?: number;
    height?: number;
    style?: CSSProperties;
    children?: ReactNode;
  }

  interface GeographiesChildrenArgs {
    geographies: Geography[];
  }

  interface GeographiesProps {
    geography: string | object;
    children: (args: GeographiesChildrenArgs) => ReactNode;
  }

  interface Geography {
    rsmKey: string;
    properties: Record<string, unknown>;
  }

  interface GeographyStyleState {
    outline?: string;
    fill?: string;
    stroke?: string;
    opacity?: number;
    fillOpacity?: number;
  }

  interface GeographyProps {
    geography: Geography;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: {
      default?: GeographyStyleState;
      hover?: GeographyStyleState;
      pressed?: GeographyStyleState;
    };
  }

  interface MarkerProps {
    coordinates: [number, number];
    children?: ReactNode;
  }

  export const ComposableMap: ComponentType<ComposableMapProps>;
  export const Geographies: ComponentType<GeographiesProps>;
  export const Geography: ComponentType<GeographyProps>;
  export const Marker: ComponentType<MarkerProps>;
}
