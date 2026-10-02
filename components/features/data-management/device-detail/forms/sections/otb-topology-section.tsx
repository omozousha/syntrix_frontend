import {
  type TopologySectionProps,
  TopologyCard,
  toDeviceOptions,
} from "../../sections/device-topology-helpers";
import {
  ComboboxField,
  SelectField,
} from "../../sections/device-technical-helpers";
import { useTranslate } from "@/lib/use-locale";

export function OtbTopologySection(props: TopologySectionProps) {
  const { t } = useTranslate();
  const lookup = props.topologyLookup || {};

  return (
    <TopologyCard title={t("topo.titleOtb")}>
      <ComboboxField
        label="From Device"
        value={props.form.from_device_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, from_device_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder={t("topo.searchDeviceUpstream")}
        options={toDeviceOptions(lookup.devices || [], t("topo.selectFromDevice"), t)}
      />
      <ComboboxField
        label="To Device"
        value={props.form.to_device_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, to_device_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder={t("topo.searchDeviceDownstream")}
        options={toDeviceOptions(lookup.devices || [], t("topo.selectToDevice"), t)}
      />
      <ComboboxField
        label="From Cable"
        value={props.form.from_cable_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, from_cable_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder={t("topo.searchFromCable")}
        options={toDeviceOptions(lookup.devices || [], t("topo.selectFromCable"), t)}
      />
      <ComboboxField
        label="To Cable"
        value={props.form.to_cable_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, to_cable_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder={t("topo.searchToCable")}
        options={toDeviceOptions(lookup.devices || [], t("topo.selectToCable"), t)}
      />
      <SelectField
        label="Koneksi Backbone"
        value={props.form.is_backbone_connection || "false"}
        options={["false", "true"]}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, is_backbone_connection: value }))
        }
        disabled={!props.editing}
        compact
      />
    </TopologyCard>
  );
}
