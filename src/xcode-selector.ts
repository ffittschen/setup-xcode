import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as fs from "fs";
import * as semver from "semver";
import { getInstalledXcodeApps, getXcodeVersionInfo, XcodeVersion } from "./xcode-utils";

export class XcodeSelector {
    public getAllVersions(): XcodeVersion[] {
        const potentialXcodeApps = getInstalledXcodeApps().map(appPath => getXcodeVersionInfo(appPath));
        const xcodeVersions = potentialXcodeApps.filter((app): app is XcodeVersion => !!app);

        // sort versions array by descending to make sure that the newest version will be picked up
        return xcodeVersions.sort((first, second) => semver.compare(second.version, first.version));
    }

    public findVersion(versionSpec: string): XcodeVersion | null {
        const availableVersions = this.getAllVersions();
        if (availableVersions.length === 0) {
            return null;
        }

        if (versionSpec === "latest") {
            return availableVersions[0];
        }

        if (versionSpec === "latest-stable") {
            return availableVersions.filter(ver => ver.stable)[0];
        }

        return availableVersions.find(ver => semver.satisfies(ver.version, versionSpec)) ?? null;
    }

    async setVersion(xcodeVersion: XcodeVersion): Promise<void> {
        if (!fs.existsSync(xcodeVersion.path)) {
            return Promise.reject(
                new Error(
                    `Invalid version: Directory '${xcodeVersion.path}' doesn't exist`
                )
            );
        }


        // set "MD_APPLE_SDK_ROOT" environment variable to specify Xcode for Mono and Xamarin
        core.exportVariable("MD_APPLE_SDK_ROOT", xcodeVersion.path);

        return await exec
            .exec(
                "sudo",
                ["xcode-select", "-s", xcodeVersion.path]
                // options
            )
            .then(() => {
                return undefined;
            });
    }
    
}
