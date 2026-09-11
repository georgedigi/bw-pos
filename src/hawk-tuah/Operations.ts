import axios from "axios";

export async function fetchHoldCartReasons(
    site_url: string,
    company_prefix: string,
  ) {
    const form = new FormData();
    form.append("tp", "getHeldCartReasons");
    form.append("cp", company_prefix);
  
    try {
      const response = await axios.postForm(
        `${site_url}process.php`,
        form,
      );
      console.log("Held cart reasons: ", response.data)
  
      if (typeof response.data === "string") {
        return null;
      }
      return response.data;
    } catch (e) {
      console.error(e);
      if (axios.isAxiosError(e)) {
        console.error(e);
      }
      console.error("Something went wrong");
      return null;
    }
  }