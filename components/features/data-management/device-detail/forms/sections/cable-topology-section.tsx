import {
  type TopologySectionProps,
  TopologyCard,
  toDeviceOptions,
  toRouteOptions,
} from "../../sections/device-topology-helpers";
import { ComboboxField } from "../../sections/device-technical-helpers";
import { useTranslate } from "@/lib/use-locale";

export function CableTopologySection(props: TopologySectionProps) {
  const { t } = useTranslate();
  const lookup = props.topologyLookup || {};

  return (
    <TopologyCard title={t("topo.titleCable")}>
      <ComboboxField
        label="From Device"
        value={props.form.from_device_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, from_device_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder={t("topo.searchFromDevice")}
        options={toDeviceOptions(lookup.devices || [], t("topo.selectFromDevice"), t)}
      />
      <ComboboxField
        label="From Port"
        value={props.form.from_port_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, from_port_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder={t("topo.searchFromPort")}
        options={[
          { value: "__none__", label: t("topo.selectFromPort") },
          ...(lookup.ports || []).map((port) => ({
            value: port.id,
            label: port.port_label || `Port ${port.port_index || "?"}`,
          })),
        ]}
      />
      <ComboboxField
        label="To Device"
        value={props.form.to_device_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, to_device_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder={t("topo.searchToDevice")}
        options={toDeviceOptions(lookup.devices || [], t("topo.selectToDevice"), t)}
      />
      <ComboboxField
        label="To Port"
        value={props.form.to_port_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, to_port_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder={t("topo.searchToPort")}
        options={[
          { value: "__none__", label: t("topo.selectToPort") },
          ...(lookup.ports || []).map((port) => ({
            value: port.id,
            label: port.port_label || `Port ${port.port_index || "?"}`,
          })),
        ]}
      />
      <ComboboxField
        label="Route"
        value={props.form.route_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, route_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder={t("topo.searchRoute")}
        options={toRouteOptions(lookup.routes || [], t("topo.selectRoute"), t)}
      />
    </TopologyCard>
  );
}
