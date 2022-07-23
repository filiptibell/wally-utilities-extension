import { runWallyCliCommand } from "../../wally/cli";





export const runCliCommand = async (args: {
	command: string,
	args?: string[]
}) => {
	return await runWallyCliCommand(args.command, ...(args.args ? args.args : []));
};





export default {
	runCliCommand,
};
