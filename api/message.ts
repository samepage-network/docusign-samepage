import createBackendClientHandler from "samepage/backend/createBackendClientHandler";
import decodeState from "src/util/decodeState";
import encodeState from "src/util/encodeState";
import { notebookRequestNodeQuerySchema } from "samepage/internal/types";
import { z } from "zod";

type NodeAssignment = { id: string };
type Assignment = Record<string, NodeAssignment | string | number | RegExp>;
const isNode = (v: Assignment[string]): v is NodeAssignment =>
  typeof v === "object" && v !== null && !(v instanceof RegExp);

const fireNodeQuery = async (
  args: z.infer<typeof notebookRequestNodeQuerySchema>,
  token: string
) => {
  const getAssignments = (
    conditions: z.infer<typeof notebookRequestNodeQuerySchema>["conditions"],
    initialVars: string[] = []
  ) => {
    return conditions.reduce(
      (programs, condition, index) => {
        return programs;
      },
      {
        assignments: new Set<Assignment>(),
        vars: new Set<string>(initialVars),
      }
    ).assignments;
  };
  const assignments = getAssignments(args.conditions);

  const results = Array.from(assignments).map((res) => {
    const returnNodeValue = res[args.returnNode];
    const returnNode = isNode(returnNodeValue)
      ? returnNodeValue
      : typeof returnNodeValue !== "object"
      ? { id: returnNodeValue.toString() }
      : { id: returnNodeValue.source };
    return args.selections.reduce((result, selection) => {
      return result;
    }, returnNode);
  });
  return results;
};

const message = (args: Record<string, unknown>) => {
  return createBackendClientHandler({
    getDecodeState: (token) => (id, state) => {
      return decodeState(id, state, token);
    },
    getNotebookRequestHandler:
      (token) =>
      async ({ request }) => {
        // TODO
        if (request.schema === "node-query") {
          const result = notebookRequestNodeQuerySchema.safeParse(request);
          if (!result.success) return {};
          const results = await fireNodeQuery(result.data, token);
          return {
            results,
          };
        } else if (typeof request.notebookPageId === "string") {
          const pageData = await encodeState({
            notebookPageId: request.notebookPageId,
            token,
          });
          return pageData;
        }
        return {};
      },
    getNotebookResponseHandler: (token) => async (response) => {
      // TODO
    },
  })(args);
};

export default message;
