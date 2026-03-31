import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import * as echarts from "echarts";
import type { EChartsOption, EChartsType } from "echarts";
import { cn } from "@/lib/utils.ts";

type EChartProps = {
    option: EChartsOption;
    className?: string;
    style?: CSSProperties;
    height?: number;
};

export function getChartColor(variable: string, fallback: string) {
    if (typeof window === "undefined") return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    if (!value) return fallback;
    if (value.startsWith("hsl(") || value.startsWith("#") || value.startsWith("rgb(")) return value;
    return `hsl(${value})`;
}

export function EChart({ option, className, style, height = 320 }: EChartProps) {
    const chartRef = useRef<HTMLDivElement | null>(null);
    const instanceRef = useRef<EChartsType | null>(null);

    useEffect(() => {
        const element = chartRef.current;
        if (!element) return;

        const chart = echarts.init(element, undefined, { renderer: "canvas" });
        instanceRef.current = chart;
        chart.setOption(option);

        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
        });
        resizeObserver.observe(element);

        const themeObserver = new MutationObserver(() => {
            chart.setOption(option, true);
            chart.resize();
        });
        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class", "style"]
        });

        return () => {
            themeObserver.disconnect();
            resizeObserver.disconnect();
            chart.dispose();
            instanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        instanceRef.current?.setOption(option, true);
        instanceRef.current?.resize();
    }, [option]);

    return <div ref={chartRef} className={cn("w-full", className)} style={{ height, minHeight: height, ...style }} />;
}
