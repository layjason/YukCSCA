import "@typespec/http";
import "@typespec/openapi";
import "@typespec/openapi3";
import "./common.tsp";
import "./auth.tsp";
import "./profile.tsp";
import "./academic-admin.tsp";
import "./academic-student.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@service(#{ title: "YukCSCA API" })
@info(#{ version: "0.1.0", summary: "Contract-first API for YukCSCA" })
namespace YukCSCA;
