import NoResult from "@/components/shared/NoResult";
import Pagination from "@/components/shared/Pagination";
import TagCard from "@/components/shared/cards/TagCard";
import Filters from "@/components/shared/filters/Filters";
import LocalSearchbar from "@/components/shared/search/LocalSearchbar";
import { TagFilters } from "@/contants/filters";
import { getAllTags } from "@/lib/actions/tag.action";
import React from "react";

const Page = async () => {
  const results = await getAllTags({});
  return (
    <>
      <h1 className="h1-bold text-dark100_light900">Tags</h1>
      <article className="mt-11 flex justify-between gap-5 max-sm:flex-col sm:items-center">
        <LocalSearchbar
          route="/community"
          iconPosition="left"
          imgSrc="/assets/icons/search.svg"
          placeholder="Search by tag name..."
          otherClasses="flex-1"
        />
        <Filters
          filters={TagFilters}
          otherClasses="min-h-[56px] sm:min-w-[170px]"
        />
      </article>

      <section className="mt-12 flex flex-wrap gap-4">
        {results.tags.length > 0 ? (
          results.tags.map((tag, index) => <TagCard key={index} tag={tag} />)
        ) : (
          <NoResult
            title={"No Tags Found"}
            description={"It looks like there are no tags found"}
            link={"/ask-question"}
            linkTitle={"Ask a question"}
          />
        )}
      </section>

      <div className="mt-10">
        {results.tags.length > 10 && (
          <Pagination pageNumber={1} isNext={true} />
        )}
      </div>
    </>
  );
};

export default Page;
