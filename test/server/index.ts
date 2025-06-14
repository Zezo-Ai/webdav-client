import path from "path";
import { fileURLToPath } from "url";
import { v2 as ws } from "webdav-server";
import { PASSWORD, USERNAME } from "./credentials.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export interface WebDAVServer {
    start: () => Promise<void>;
    stop: () => Promise<void>;
}

export function createServer(
    dir: string,
    port: number,
    authType: "basic" | "digest"
): WebDAVServer {
    if (!dir) {
        throw new Error("Expected target directory");
    }
    const userManager = new ws.SimpleUserManager();
    const user = userManager.addUser(USERNAME, PASSWORD);
    let auth;
    switch (authType) {
        case "digest":
            auth = new ws.HTTPDigestAuthentication(userManager, "test");
            break;
        case "basic":
        /* falls-through */
        default:
            auth = new ws.HTTPBasicAuthentication(userManager);
            break;
    }
    const privilegeManager = new ws.SimplePathPrivilegeManager();
    privilegeManager.setRights(user, "/", ["all"]);
    const server = new ws.WebDAVServer({
        port,
        httpAuthentication: auth,
        privilegeManager: privilegeManager,
        maxRequestDepth: Infinity,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods":
                "HEAD, GET, PUT, PROPFIND, DELETE, OPTIONS, MKCOL, MOVE, COPY",
            "Access-Control-Allow-Headers":
                "Accept, Authorization, Content-Type, Content-Length, Depth"
        }
    });
    // console.log(`Created server on localhost with port: 9988, and authType: ${authType}`);
    return {
        start: function start() {
            return new Promise<void>(function (resolve) {
                server.setFileSystem("/webdav/server", new ws.PhysicalFileSystem(dir), function () {
                    server.start(() => resolve());
                });
            });
        },

        stop: function stop() {
            return new Promise<void>(function (resolve) {
                server.stop(resolve);
            });
        }
    };
}

export function createWebDAVServer(
    port: number,
    authType: "basic" | "digest" = "basic"
): WebDAVServer {
    return createServer(path.resolve(dirname, "../testContents"), port, authType);
}
