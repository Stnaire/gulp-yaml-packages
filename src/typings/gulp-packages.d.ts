
declare namespace GP {
    export interface Options {
        env?: string;
        theme?: number;
        verbose?: boolean;
        strict?: boolean;
        watch?: boolean;
        debug?: boolean;
    }

    export interface GulpfileConfiguration {
        processors: ProcessorsManager;
        packages: GulpfileTaskConfiguration[];
    }

    export interface GulpfileTaskConfiguration {
        name: string;
        theme: string;
        version: string;
        scripts: PackageInputOutputConfiguration;
        styles: PackageInputOutputConfiguration;
        misc: PackageInputOutputConfiguration[];
    }

    export interface GulpfileInputConfiguration {
        files: string[];
        processors: GulpfileProcessorsConfiguration;
    }

    export interface GulpfileProcessorsConfiguration {
        executionOrder: string[];
        processors: {[key: string]: Object};
    }

    export interface PackageConfiguration {
        packageFileId: number;
        originalPackageFileId: number;
        name: PackageName;
        theme: string;
        standalone: boolean;
        depsMerged: boolean;
        version: PackageVersion;
        deps: PackageDependencyConfiguration[];
        scripts: PackageInputOutputConfiguration;
        styles: PackageInputOutputConfiguration;
        misc: PackageInputOutputConfiguration[];
    }

    export interface PackageName {
        name: string;
        shared: boolean;
    }

    export interface PackageInputOutputConfiguration {
        watch: Path[];
        autoWatch?: boolean;
        input: PackageInputConfiguration[];
        output: PackageOutputConfiguration;
    }

    export interface PackageInputConfiguration {
        files: Path[];
        processors: {[key: string]: Object};
    }

    export interface PackageOutputConfiguration {
        prod: Path;
        dev: Path;
    }

    export interface PackageDependencyConfiguration {
        packageFileId: number;
        packageName: string;
        packageTheme: string;
        packageVersion: PackageVersion;
    }

    export interface PackageVersion {
        text: string;
        components: number[];
    }

    export interface PackageFileConfiguration {
        id: number;
        path: string;
        parameters: Object;
        processors: PackageFileProcessorConfiguration[];
        packages: {
            [key: string]: PackageConfiguration[]
        };
        imports: Path[];
    }

    export interface PackageFileProcessorConfiguration {
        name: string;
        callback: string;
        extensions: string[];
        options: Object;
    }

    export interface Path {
        packageId: number;
        original: string;
        absolute: string;
        extension: string;
        isGlob: boolean;
        globBase: string;
    }
}
