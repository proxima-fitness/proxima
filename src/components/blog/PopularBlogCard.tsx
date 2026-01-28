
interface IProps {
    blog: TBlog;
}

export const PopularBlogCard: React.FC<IProps> = (props) => {

    const  {
        blog,
    } = props;

    return (
        <div key={ blog.id }>
            <div className="pb-8 text-foreground">
                { blog.title }
            </div>
        </div>
    );
};



